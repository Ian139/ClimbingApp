import Foundation

protocol RoutesRepository {
    func fetchRoutes() async throws -> [Route]
}

struct MockRoutesRepository: RoutesRepository {
    func fetchRoutes() async throws -> [Route] {
        return [
            Route(
                id: UUID().uuidString,
                userId: "local",
                wallId: "wall-1",
                name: "Granite Drift",
                description: "Slabby tech and a tight finish.",
                gradeV: "V4",
                gradeFont: nil,
                holds: [],
                isPublic: true,
                viewCount: 32,
                shareToken: nil,
                createdAt: ISO8601DateFormatter().string(from: Date()),
                updatedAt: ISO8601DateFormatter().string(from: Date()),
                userName: "Ian",
                wallImageUrl: nil,
                likeCount: 12,
                isLiked: false,
                ascents: [],
                comments: []
            ),
            Route(
                id: UUID().uuidString,
                userId: "local",
                wallId: "wall-2",
                name: "Mossy Traverse",
                description: "Long moves with a heel finish.",
                gradeV: "V6",
                gradeFont: nil,
                holds: [],
                isPublic: true,
                viewCount: 18,
                shareToken: nil,
                createdAt: ISO8601DateFormatter().string(from: Date().addingTimeInterval(-86000)),
                updatedAt: ISO8601DateFormatter().string(from: Date().addingTimeInterval(-86000)),
                userName: "ClimbSet",
                wallImageUrl: nil,
                likeCount: 8,
                isLiked: false,
                ascents: [],
                comments: []
            )
        ]
    }
}

#if canImport(Supabase)
import Supabase

struct SupabaseRoutesRepository: RoutesRepository {
    static func isConfigured() -> Bool {
        SupabaseConfig.current != nil
    }

    func fetchRoutes() async throws -> [Route] {
        guard let client = SupabaseClientProvider.client else { return [] }
        let response: [Route] = try await client.database
            .from("routes")
            .select("*, ascents(*), comments(*)")
            .eq("is_public", value: true)
            .order("created_at", ascending: false)
            .execute()
            .value
        if response.isEmpty {
            return response
        }

        let routeIds = response.map { $0.id }
        let likes: [RouteLikeFull] = try await client.database
            .from("route_likes")
            .select("route_id, user_id")
            .in("route_id", values: routeIds)
            .execute()
            .value

        let currentUserId = (try? await client.auth.session.user.id.uuidString) ?? ""
        var likesByRoute: [String: [String]] = [:]
        likes.forEach { like in
            likesByRoute[like.routeId, default: []].append(like.userId)
        }

        var enriched = response
        for index in enriched.indices {
            let likedBy = likesByRoute[enriched[index].id] ?? []
            enriched[index].likeCount = likedBy.count
            enriched[index].isLiked = currentUserId.isEmpty ? false : likedBy.contains(currentUserId)
        }

        return enriched
    }
}
#endif

enum AppServices {
    static let routesRepository: RoutesRepository = {
        #if canImport(Supabase)
        if SupabaseRoutesRepository.isConfigured() {
            return SupabaseRoutesRepository()
        }
        #endif
        return MockRoutesRepository()
    }()
}

struct RouteLikeFull: Codable {
    let routeId: String
    let userId: String

    enum CodingKeys: String, CodingKey {
        case routeId = "route_id"
        case userId = "user_id"
    }
}
