import SwiftUI
import Supabase

struct RouteDetailView: View {
    let route: Route
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var session: AppSession
    @EnvironmentObject var routesViewModel: RoutesViewModel
    @StateObject private var commentsViewModel: CommentsViewModel
    @StateObject private var wallsViewModel = WallsViewModel()
    @State private var isLiked = false
    @State private var likeCount: Int = 0
    @State private var likeError: String? = nil
    @State private var isWallPickerPresented = false
    @State private var wallImageUrl: String?
    @State private var wallUpdateError: String? = nil

    init(route: Route) {
        self.route = route
        _commentsViewModel = StateObject(wrappedValue: CommentsViewModel(routeId: route.id))
        _wallImageUrl = State(initialValue: route.normalizedWallImageUrl)
    }

    var body: some View {
        NavigationStack {
            ZStack {
                AppColor.background.ignoresSafeArea()
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        wallHeader
                        detailsSection
                        actionRow
                        statsSection
                        Divider().background(AppColor.border)
                        commentsSection
                    }
                    .padding(AppLayout.horizontalPadding)
                    .padding(.bottom, 24)
                }
            }
            .navigationTitle("Route")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                        .foregroundColor(AppColor.primary)
                }
            }
            .onAppear {
                likeCount = route.likeCount ?? 0
                isLiked = route.isLiked ?? false
            }
            .task {
                await commentsViewModel.load()
            }
            .sheet(isPresented: $isWallPickerPresented) {
                WallPickerView(viewModel: wallsViewModel) { wall in
                    Task {
                        await updateRouteWall(wall)
                    }
                }
                .environmentObject(session)
            }
        }
    }

    private var wallHeader: some View {
        GeometryReader { proxy in
            ZStack {
                RoundedRectangle(cornerRadius: AppLayout.cornerRadius)
                    .fill(AppColor.surface)
                    .overlay(
                        RoundedRectangle(cornerRadius: AppLayout.cornerRadius)
                            .stroke(AppColor.border, lineWidth: 1)
                    )

                if let url = wallImageURL {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .empty:
                            Color.clear
                        case .success(let image):
                            image
                                .resizable()
                                .scaledToFill()
                        case .failure:
                            defaultWallImage
                        @unknown default:
                            defaultWallImage
                        }
                    }
                    .frame(width: proxy.size.width, height: proxy.size.height)
                    .clipShape(RoundedRectangle(cornerRadius: AppLayout.cornerRadius))
                } else {
                    defaultWallImage
                }

                ForEach(route.holds) { hold in
                    routeHoldMarker(for: hold)
                        .position(
                            x: hold.normalizedX * proxy.size.width,
                            y: hold.normalizedY * proxy.size.height
                        )
                }

                VStack {
                    HStack(spacing: 8) {
                        Text(route.name)
                            .font(AppTypography.headline)
                            .foregroundColor(.white)
                            .shadow(color: .black.opacity(0.8), radius: 3, x: 0, y: 1)
                            .lineLimit(1)
                        if let grade = route.gradeV {
                            Text(grade)
                                .font(AppTypography.label)
                                .foregroundColor(.white)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 5)
                                .background(AppColor.primary.opacity(0.9))
                                .clipShape(Capsule())
                        }
                        Spacer()
                    }
                    Spacer()
                }
                .padding(12)
            }
        }
        .frame(height: 260)
        .clipShape(RoundedRectangle(cornerRadius: AppLayout.cornerRadius))
    }

    private var detailsSection: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 8) {
                Text(route.name)
                    .font(AppTypography.title)
                    .foregroundColor(AppColor.text)
                if let grade = route.gradeV {
                    Text(grade)
                        .font(AppTypography.label)
                        .foregroundColor(AppColor.primary)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(AppColor.primary.opacity(0.12))
                        .clipShape(Capsule())
                }
            }
            Text(route.userName ?? "Setter")
                .font(AppTypography.label)
                .foregroundColor(AppColor.muted)
            if let description = route.description, !description.isEmpty {
                Text(description)
                    .font(AppTypography.body)
                    .foregroundColor(AppColor.text)
                    .padding(.top, 6)
            }
        }
    }

    private var actionRow: some View {
        LazyVGrid(
            columns: [
                GridItem(.flexible(), spacing: 10),
                GridItem(.flexible(), spacing: 10)
            ],
            spacing: 10
        ) {
            actionButton(title: isLiked ? "Liked" : "Like") {
                Task { await toggleLike() }
            }
            actionButton(title: wallImageURL == nil ? "Set Wall" : "Change Wall") {
                wallUpdateError = nil
                isWallPickerPresented = true
            }
            actionButton(title: "Log Send") {}
            actionButton(title: "Share") {}
        }
    }

    private var statsSection: some View {
        HStack(spacing: 16) {
            statItem(title: "Holds", value: "\(route.holds.count)")
            statItem(title: "Likes", value: "\(max(likeCount, 0))")
            statItem(title: "Sends", value: "\(route.ascents.count)")
        }
        .padding(.vertical, 12)
        .padding(.horizontal, 12)
        .background(AppColor.surface)
        .overlay(
            RoundedRectangle(cornerRadius: AppLayout.cornerRadius)
                .stroke(AppColor.border, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: AppLayout.cornerRadius))
    }

    private var commentsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Comments")
                .font(AppTypography.headline)
                .foregroundColor(AppColor.text)

            if commentsViewModel.comments.isEmpty {
                Text("No comments yet")
                    .font(AppTypography.label)
                    .foregroundColor(AppColor.muted)
            } else {
                ForEach(commentsViewModel.comments) { comment in
                    CommentRow(comment: comment, canDelete: comment.userId == session.userId?.uuidString) {
                        Task { await commentsViewModel.deleteComment(id: comment.id) }
                    }
                }
            }

            if let wallUpdateError, !wallUpdateError.isEmpty {
                Text(wallUpdateError)
                    .font(AppTypography.label)
                    .foregroundColor(AppColor.destructive)
            }

            if session.userId == nil {
                Text("Sign in to add a comment")
                    .font(AppTypography.label)
                    .foregroundColor(AppColor.muted)
            } else {
                VStack(spacing: 10) {
                    TextEditor(text: $commentsViewModel.newComment)
                        .frame(minHeight: 80)
                        .padding(8)
                        .background(AppColor.surface)
                        .overlay(
                            RoundedRectangle(cornerRadius: AppLayout.cornerRadius)
                                .stroke(AppColor.border, lineWidth: 1)
                        )

                    HStack {
                        Button {
                            commentsViewModel.isBeta.toggle()
                        } label: {
                            Text(commentsViewModel.isBeta ? "Beta" : "Mark Beta")
                                .font(AppTypography.label)
                                .foregroundColor(commentsViewModel.isBeta ? AppColor.primary : AppColor.text)
                                .padding(.horizontal, 10)
                                .padding(.vertical, 6)
                                .background(commentsViewModel.isBeta ? AppColor.primary.opacity(0.12) : AppColor.surface)
                                .clipShape(Capsule())
                        }
                        Spacer()
                        Button {
                            Task {
                                await commentsViewModel.postComment(
                                    userId: session.userId,
                                    userName: session.displayName
                                )
                            }
                        } label: {
                            Text("Post")
                                .font(AppTypography.label)
                                .foregroundColor(.white)
                                .padding(.horizontal, 14)
                                .padding(.vertical, 8)
                                .background(AppColor.primary)
                                .clipShape(Capsule())
                        }
                        .disabled(commentsViewModel.newComment.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                        .opacity(commentsViewModel.newComment.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? 0.5 : 1)
                    }
                }
            }
        }
    }

    private func actionButton(title: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(AppTypography.label)
                .foregroundColor(AppColor.primary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
                .background(AppColor.primary.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }

    private func routeHoldMarker(for hold: Hold) -> some View {
        let size: CGFloat
        let borderWidth: CGFloat
        switch hold.size {
        case .small:
            size = 24
            borderWidth = 2
        case .medium:
            size = 36
            borderWidth = 3
        case .large:
            size = 56
            borderWidth = 4
        }

        return ZStack {
            Circle()
                .stroke(Color.hex(hold.type.colorHex), lineWidth: borderWidth)
                .background(Circle().fill(Color.hex(hold.type.colorHex).opacity(0.25)))
                .shadow(color: Color.hex(hold.type.colorHex).opacity(0.45), radius: 6)
                .frame(width: size, height: size)
            if hold.type == .start || hold.type == .finish {
                Text(hold.type.shortLabel)
                    .font(.system(size: size * 0.34, weight: .bold))
                    .foregroundColor(.white)
                    .shadow(color: .black.opacity(0.9), radius: 2)
            }
        }
    }

    private var wallImageURL: URL? {
        guard let normalized = normalizedRemoteImageURLString(wallImageUrl) else { return nil }
        return URL(string: normalized)
    }

    private var defaultWallImage: some View {
        Image("DefaultWall")
            .resizable()
            .scaledToFill()
    }

    private func toggleLike() async {
        guard let client = SupabaseClientProvider.client, let userId = session.userId else { return }
        likeError = nil
        do {
            if isLiked {
                _ = try await client.database
                    .from("route_likes")
                    .delete()
                    .eq("route_id", value: route.id)
                    .eq("user_id", value: userId.uuidString)
                    .execute()
                isLiked = false
                likeCount = max(0, likeCount - 1)
            } else {
                let payload: [String: AnyEncodable] = [
                    "route_id": AnyEncodable(route.id),
                    "user_id": AnyEncodable(userId.uuidString)
                ]
                _ = try await client.database
                    .from("route_likes")
                    .insert(payload)
                    .execute()
                isLiked = true
                likeCount += 1
            }
        } catch {
            likeError = error.localizedDescription
        }
    }

    private func updateRouteWall(_ wall: Wall) async {
        do {
            try await routesViewModel.assignWall(routeId: route.id, wall: wall)
            wallImageUrl = wall.normalizedImageUrl
        } catch {
            wallUpdateError = error.localizedDescription
        }
    }

    private func statItem(title: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(value)
                .font(AppTypography.headline)
                .foregroundColor(AppColor.text)
            Text(title)
                .font(AppTypography.label)
                .foregroundColor(AppColor.muted)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private struct CommentRow: View {
    let comment: Comment
    let canDelete: Bool
    let onDelete: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(comment.userName ?? "Climber")
                    .font(AppTypography.label)
                    .foregroundColor(AppColor.text)
                Spacer()
                Text(formatTime(comment.createdAt))
                    .font(AppTypography.label)
                    .foregroundColor(AppColor.muted)
            }
            Text(comment.content)
                .font(AppTypography.body)
                .foregroundColor(AppColor.text)
            if comment.isBeta {
                Text("Beta")
                    .font(AppTypography.label)
                    .foregroundColor(AppColor.primary)
            }
            if canDelete {
                Button(role: .destructive) {
                    onDelete()
                } label: {
                    Text("Delete")
                        .font(AppTypography.label)
                }
            }
        }
        .padding(12)
        .background(AppColor.surface)
        .overlay(
            RoundedRectangle(cornerRadius: AppLayout.cornerRadius)
                .stroke(AppColor.border, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: AppLayout.cornerRadius))
    }

    private func formatTime(_ value: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let date = formatter.date(from: value) ?? Date()
        let diff = Date().timeIntervalSince(date)
        let mins = Int(diff / 60)
        if mins < 60 { return "\(mins)m" }
        let hours = mins / 60
        if hours < 24 { return "\(hours)h" }
        let days = hours / 24
        if days < 7 { return "\(days)d" }
        return "\(days / 7)w"
    }
}
