import Foundation

protocol RoutesRepository {
    func fetchRoutes() async throws -> [Route]
    func createRoute(_ draft: RouteDraft) async throws -> Route
    func updateRoute(id: String, patch: RoutePatch) async throws
}

struct RouteDraft {
    let userId: String?
    let userName: String
    let wallId: String
    let wallImageUrl: String?
    let name: String
    let description: String?
    let gradeV: String?
    let gradeFont: String?
    let holds: [Hold]
    let isPublic: Bool
}

struct RoutePatch {
    let wallId: String?
    let wallImageUrl: String?
    let name: String?
    let gradeV: String?
    let holds: [Hold]?
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
                holds: [
                    Hold(id: UUID().uuidString, x: 18, y: 72, type: .start, color: HoldType.start.colorHex, sequence: 1, size: .medium, notes: nil),
                    Hold(id: UUID().uuidString, x: 34, y: 54, type: .hand, color: HoldType.hand.colorHex, sequence: 2, size: .medium, notes: nil),
                    Hold(id: UUID().uuidString, x: 61, y: 44, type: .foot, color: HoldType.foot.colorHex, sequence: nil, size: .small, notes: nil),
                    Hold(id: UUID().uuidString, x: 77, y: 22, type: .finish, color: HoldType.finish.colorHex, sequence: 3, size: .large, notes: nil)
                ],
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
                holds: [
                    Hold(id: UUID().uuidString, x: 12, y: 60, type: .start, color: HoldType.start.colorHex, sequence: nil, size: .medium, notes: nil),
                    Hold(id: UUID().uuidString, x: 48, y: 58, type: .hand, color: HoldType.hand.colorHex, sequence: nil, size: .medium, notes: nil),
                    Hold(id: UUID().uuidString, x: 69, y: 52, type: .hand, color: HoldType.hand.colorHex, sequence: nil, size: .medium, notes: nil),
                    Hold(id: UUID().uuidString, x: 86, y: 27, type: .finish, color: HoldType.finish.colorHex, sequence: nil, size: .large, notes: nil)
                ],
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

    func createRoute(_ draft: RouteDraft) async throws -> Route {
        buildRoute(
            id: UUID().uuidString,
            draft: draft,
            shareToken: generateShareToken(),
            timestamp: isoTimestamp()
        )
    }

    func updateRoute(id: String, patch: RoutePatch) async throws {}
}

#if canImport(Supabase)
import Supabase

struct SupabaseRoutesRepository: RoutesRepository {
    static func isConfigured() -> Bool {
        SupabaseConfig.current != nil
    }

    func fetchRoutes() async throws -> [Route] {
        guard let client = SupabaseClientProvider.client else { return [] }
        let response = try await fetchRoutesWithFallback(client: client)
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

        let wallImageById = (try? await fetchWallImages(
            client: client,
            wallIds: Array(Set(response.map(\.wallId))),
            currentUserId: currentUserId
        )) ?? [:]

        var enriched = response
        for index in enriched.indices {
            let likedBy = likesByRoute[enriched[index].id] ?? []
            enriched[index].likeCount = likedBy.count
            enriched[index].isLiked = currentUserId.isEmpty ? false : likedBy.contains(currentUserId)
            if enriched[index].normalizedWallImageUrl == nil {
                enriched[index] = Route(
                    id: enriched[index].id,
                    userId: enriched[index].userId,
                    wallId: enriched[index].wallId,
                    name: enriched[index].name,
                    description: enriched[index].description,
                    gradeV: enriched[index].gradeV,
                    gradeFont: enriched[index].gradeFont,
                    holds: enriched[index].holds,
                    isPublic: enriched[index].isPublic,
                    viewCount: enriched[index].viewCount,
                    shareToken: enriched[index].shareToken,
                    createdAt: enriched[index].createdAt,
                    updatedAt: enriched[index].updatedAt,
                    userName: enriched[index].userName,
                    wallImageUrl: normalizedRemoteImageURLString(wallImageById[enriched[index].wallId]),
                    likeCount: enriched[index].likeCount,
                    isLiked: enriched[index].isLiked,
                    ascents: enriched[index].ascents,
                    comments: enriched[index].comments
                )
            }
        }

        return enriched
    }

    func createRoute(_ draft: RouteDraft) async throws -> Route {
        guard let client = SupabaseClientProvider.client else {
            throw RoutesRepositoryError.unavailable
        }

        let routeId = UUID().uuidString
        let timestamp = isoTimestamp()
        let shareToken = generateShareToken()
        let payload: [String: AnyEncodable] = [
            "id": AnyEncodable(routeId),
            "user_id": AnyEncodable(draft.userId),
            "user_name": AnyEncodable(draft.userName),
            "wall_id": AnyEncodable(draft.wallId),
            "wall_image_url": AnyEncodable(draft.wallImageUrl),
            "name": AnyEncodable(draft.name),
            "description": AnyEncodable(draft.description),
            "grade_v": AnyEncodable(draft.gradeV),
            "grade_font": AnyEncodable(draft.gradeFont),
            "holds": AnyEncodable(draft.holds),
            "is_public": AnyEncodable(draft.isPublic),
            "view_count": AnyEncodable(0),
            "share_token": AnyEncodable(shareToken),
            "created_at": AnyEncodable(timestamp),
            "updated_at": AnyEncodable(timestamp)
        ]

        _ = try await client.database
            .from("routes")
            .insert(payload)
            .execute()

        return buildRoute(
            id: routeId,
            draft: draft,
            shareToken: shareToken,
            timestamp: timestamp
        )
    }

    func updateRoute(id: String, patch: RoutePatch) async throws {
        guard let client = SupabaseClientProvider.client else {
            throw RoutesRepositoryError.unavailable
        }

        let payload = patchPayload(from: patch)
        guard !payload.isEmpty else { return }

        _ = try await client.database
            .from("routes")
            .update(payload)
            .eq("id", value: id)
            .execute()
    }

    private func fetchWallImages(client: SupabaseClient, wallIds: [String], currentUserId: String) async throws -> [String: String] {
        let validWallIds = wallIds.filter(isUUID)
        guard !validWallIds.isEmpty else { return [:] }

        var query = client.database
            .from("walls")
            .select("id, image_url")
            .in("id", values: validWallIds)

        if currentUserId.isEmpty {
            query = query.eq("is_public", value: true)
        } else {
            query = query.or("is_public.eq.true,user_id.eq.\(currentUserId)")
        }

        let walls: [WallImageRecord] = try await query.execute().value
        return Dictionary(uniqueKeysWithValues: walls.compactMap { wall in
            guard let imageUrl = wall.imageUrl else { return nil }
            return (wall.id, imageUrl)
        })
    }

    private func fetchRoutesWithFallback(client: SupabaseClient) async throws -> [Route] {
        do {
            return try await client.database
                .from("routes")
                .select("*, ascents(*), comments(*)")
                .eq("is_public", value: true)
                .order("created_at", ascending: false)
                .execute()
                .value
        } catch {
            do {
                let routes: [RouteWithoutComments] = try await client.database
                    .from("routes")
                    .select("*, ascents(*)")
                    .eq("is_public", value: true)
                    .order("created_at", ascending: false)
                    .execute()
                    .value
                return routes.map { $0.asRoute() }
            } catch {
                let routes: [RoutePlainRecord] = try await client.database
                    .from("routes")
                    .select("*")
                    .eq("is_public", value: true)
                    .order("created_at", ascending: false)
                    .execute()
                    .value
                return routes.map { $0.asRoute() }
            }
        }
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

private struct WallImageRecord: Codable {
    let id: String
    let imageUrl: String?

    enum CodingKeys: String, CodingKey {
        case id
        case imageUrl = "image_url"
    }
}

private struct RouteWithoutComments: Codable {
    let id: String
    let userId: String?
    let wallId: String
    let name: String
    let description: String?
    let gradeV: String?
    let gradeFont: String?
    let holds: [Hold]
    let isPublic: Bool
    let viewCount: Int
    let shareToken: String?
    let createdAt: String
    let updatedAt: String
    let userName: String?
    let wallImageUrl: String?
    let ascents: [Ascent]

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case wallId = "wall_id"
        case name
        case description
        case gradeV = "grade_v"
        case gradeFont = "grade_font"
        case holds
        case isPublic = "is_public"
        case viewCount = "view_count"
        case shareToken = "share_token"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case userName = "user_name"
        case wallImageUrl = "wall_image_url"
        case ascents
    }

    func asRoute() -> Route {
        Route(
            id: id,
            userId: userId,
            wallId: wallId,
            name: name,
            description: description,
            gradeV: gradeV,
            gradeFont: gradeFont,
            holds: holds,
            isPublic: isPublic,
            viewCount: viewCount,
            shareToken: shareToken,
            createdAt: createdAt,
            updatedAt: updatedAt,
            userName: userName,
            wallImageUrl: wallImageUrl,
            likeCount: nil,
            isLiked: nil,
            ascents: ascents,
            comments: []
        )
    }
}

private struct RoutePlainRecord: Codable {
    let id: String
    let userId: String?
    let wallId: String
    let name: String
    let description: String?
    let gradeV: String?
    let gradeFont: String?
    let holds: [Hold]
    let isPublic: Bool
    let viewCount: Int
    let shareToken: String?
    let createdAt: String
    let updatedAt: String
    let userName: String?
    let wallImageUrl: String?

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case wallId = "wall_id"
        case name
        case description
        case gradeV = "grade_v"
        case gradeFont = "grade_font"
        case holds
        case isPublic = "is_public"
        case viewCount = "view_count"
        case shareToken = "share_token"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case userName = "user_name"
        case wallImageUrl = "wall_image_url"
    }

    func asRoute() -> Route {
        Route(
            id: id,
            userId: userId,
            wallId: wallId,
            name: name,
            description: description,
            gradeV: gradeV,
            gradeFont: gradeFont,
            holds: holds,
            isPublic: isPublic,
            viewCount: viewCount,
            shareToken: shareToken,
            createdAt: createdAt,
            updatedAt: updatedAt,
            userName: userName,
            wallImageUrl: wallImageUrl,
            likeCount: nil,
            isLiked: nil,
            ascents: [],
            comments: []
        )
    }
}

private enum RoutesRepositoryError: LocalizedError {
    case unavailable

    var errorDescription: String? {
        switch self {
        case .unavailable:
            return "Supabase is not configured for route saves."
        }
    }
}

private func buildRoute(id: String, draft: RouteDraft, shareToken: String, timestamp: String) -> Route {
    Route(
        id: id,
        userId: draft.userId,
        wallId: draft.wallId,
        name: draft.name,
        description: draft.description,
        gradeV: draft.gradeV,
        gradeFont: draft.gradeFont,
        holds: draft.holds,
        isPublic: draft.isPublic,
        viewCount: 0,
        shareToken: shareToken,
        createdAt: timestamp,
        updatedAt: timestamp,
        userName: draft.userName,
        wallImageUrl: draft.wallImageUrl,
        likeCount: 0,
        isLiked: false,
        ascents: [],
        comments: []
    )
}

private func isoTimestamp() -> String {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return formatter.string(from: Date())
}

private func generateShareToken(length: Int = 10) -> String {
    let characters = Array("ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789")
    return String((0..<length).compactMap { _ in characters.randomElement() })
}

private func isUUID(_ value: String) -> Bool {
    UUID(uuidString: value) != nil
}

private func patchPayload(from patch: RoutePatch) -> [String: AnyEncodable] {
    var payload: [String: AnyEncodable] = [
        "updated_at": AnyEncodable(isoTimestamp())
    ]

    if let wallId = patch.wallId {
        payload["wall_id"] = AnyEncodable(wallId)
    }
    if let wallImageUrl = patch.wallImageUrl {
        payload["wall_image_url"] = AnyEncodable(wallImageUrl)
    }
    if let name = patch.name {
        payload["name"] = AnyEncodable(name)
    }
    if let gradeV = patch.gradeV {
        payload["grade_v"] = AnyEncodable(gradeV)
    }
    if let holds = patch.holds {
        payload["holds"] = AnyEncodable(holds)
    }

    return payload
}
