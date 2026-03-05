import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var session: AppSession
    @StateObject private var metrics = ProfileViewModel()
    @StateObject private var wallsViewModel = WallsViewModel()
    @State private var isWallPickerPresented = false

    var body: some View {
        ZStack {
            AppColor.background.ignoresSafeArea()
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    accountSection
                    appearanceSection
                    wallsSection
                    dataSection
                    signOutButton
                }
                .padding(.bottom, 24)
            }
            .padding(AppLayout.horizontalPadding)
        }
        .navigationTitle("Settings")
        .task {
            await metrics.load(userId: session.userId)
            await wallsViewModel.load(userId: session.userId)
        }
    }

    private var accountSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Account")
                .font(AppTypography.headline)
                .foregroundColor(AppColor.text)
            Text(session.profile?.fullName ?? session.userEmail ?? "")
                .font(AppTypography.body)
                .foregroundColor(AppColor.muted)
        }
        .padding(12)
        .background(AppColor.surface)
        .overlay(
            RoundedRectangle(cornerRadius: AppLayout.cornerRadius)
                .stroke(AppColor.border, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: AppLayout.cornerRadius))
    }

    private var dataSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Data")
                .font(AppTypography.headline)
                .foregroundColor(AppColor.text)
            Text(supabaseStatus)
                .font(AppTypography.label)
                .foregroundColor(AppColor.muted)
            HStack(spacing: 12) {
                Text("Routes: \(metrics.routesCount)")
                Text("Sends: \(metrics.sendsCount)")
                Text("Likes: \(metrics.likesCount)")
            }
            .font(AppTypography.label)
            .foregroundColor(AppColor.muted)
        }
        .padding(12)
        .background(AppColor.surface)
        .overlay(
            RoundedRectangle(cornerRadius: AppLayout.cornerRadius)
                .stroke(AppColor.border, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: AppLayout.cornerRadius))
    }

    private var appearanceSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Appearance")
                .font(AppTypography.headline)
                .foregroundColor(AppColor.text)
            Text("Follows system appearance")
                .font(AppTypography.label)
                .foregroundColor(AppColor.muted)
            Text(appVersion)
                .font(AppTypography.label)
                .foregroundColor(AppColor.muted)
        }
        .padding(12)
        .background(AppColor.surface)
        .overlay(
            RoundedRectangle(cornerRadius: AppLayout.cornerRadius)
                .stroke(AppColor.border, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: AppLayout.cornerRadius))
    }

    private var wallsSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Walls")
                .font(AppTypography.headline)
                .foregroundColor(AppColor.text)
            Text("\(wallsViewModel.walls.count) walls")
                .font(AppTypography.label)
                .foregroundColor(AppColor.muted)
            Button("Manage Walls") {
                isWallPickerPresented = true
            }
            .font(AppTypography.label)
            .foregroundColor(AppColor.primary)
        }
        .padding(12)
        .background(AppColor.surface)
        .overlay(
            RoundedRectangle(cornerRadius: AppLayout.cornerRadius)
                .stroke(AppColor.border, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: AppLayout.cornerRadius))
        .sheet(isPresented: $isWallPickerPresented) {
            WallPickerView(viewModel: wallsViewModel)
                .environmentObject(session)
        }
    }

    private var supabaseStatus: String {
        SupabaseClientProvider.client == nil ? "Supabase not configured" : "Supabase connected"
    }

    private var signOutButton: some View {
        Button {
            Task { await session.signOut() }
        } label: {
            Text("Sign Out")
                .font(AppTypography.headline)
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(AppColor.destructive)
                .clipShape(RoundedRectangle(cornerRadius: AppLayout.cornerRadius))
        }
    }

    private var appVersion: String {
        let version = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "1.0"
        let build = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "1"
        return "Version \(version) (\(build))"
    }
}
