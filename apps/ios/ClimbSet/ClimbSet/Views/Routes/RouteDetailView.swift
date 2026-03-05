import SwiftUI
import Supabase

struct RouteDetailView: View {
    let route: Route
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var session: AppSession
    @StateObject private var commentsViewModel: CommentsViewModel
    @State private var isLiked = false
    @State private var likeCount: Int = 0
    @State private var likeError: String? = nil

    init(route: Route) {
        self.route = route
        _commentsViewModel = StateObject(wrappedValue: CommentsViewModel(routeId: route.id))
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
        }
    }

    private var wallHeader: some View {
        ZStack {
            RoundedRectangle(cornerRadius: AppLayout.cornerRadius)
                .fill(AppColor.surface)
                .frame(height: 200)
                .overlay(
                    RoundedRectangle(cornerRadius: AppLayout.cornerRadius)
                        .stroke(AppColor.border, lineWidth: 1)
                )

            if let imageUrl = route.wallImageUrl, let url = URL(string: imageUrl) {
                AsyncImage(url: url) { image in
                    image
                        .resizable()
                        .scaledToFill()
                } placeholder: {
                    Color.clear
                }
                .frame(height: 200)
                .clipShape(RoundedRectangle(cornerRadius: AppLayout.cornerRadius))
            } else {
                Text("Wall")
                    .font(AppTypography.label)
                    .foregroundColor(AppColor.muted)
            }
        }
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
        HStack(spacing: 12) {
            actionButton(title: isLiked ? "Liked" : "Like") {
                Task { await toggleLike() }
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
