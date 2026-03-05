import SwiftUI

struct ProfileView: View {
    @EnvironmentObject var session: AppSession
    @StateObject private var viewModel = ProfileViewModel()
    @State private var isEditPresented = false
    @State private var editFullName = ""
    @State private var editUsername = ""
    @State private var editBio = ""

    var body: some View {
        ZStack {
            AppColor.background.ignoresSafeArea()
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    header
                    statsGrid
                    highlights
                    settingsRow
                }
                .padding(AppLayout.horizontalPadding)
                .padding(.top, 16)
                .padding(.bottom, 24)
            }
        }
        .navigationTitle("Profile")
        .task {
            await viewModel.load(userId: session.userId)
        }
    }

    private var header: some View {
        VStack(spacing: 10) {
            HStack(spacing: 12) {
                Circle()
                    .fill(AppColor.secondary.opacity(0.15))
                    .frame(width: 64, height: 64)
                    .overlay(Text("🧗").font(.system(size: 28)))

            VStack(alignment: .leading, spacing: 4) {
                Text(session.profile?.fullName ?? session.profile?.username ?? session.userEmail ?? "")
                    .font(AppTypography.headline)
                    .foregroundColor(AppColor.text)
                Text(session.userEmail ?? "")
                    .font(AppTypography.label)
                    .foregroundColor(AppColor.muted)
                if let bio = session.profile?.bio, !bio.isEmpty {
                    Text(bio)
                        .font(AppTypography.label)
                        .foregroundColor(AppColor.muted)
                        .lineLimit(2)
                }
            }
            Spacer()
            }

            Button {
                editFullName = session.profile?.fullName ?? ""
                editUsername = session.profile?.username ?? ""
                editBio = session.profile?.bio ?? ""
                isEditPresented = true
            } label: {
                Text("Edit Profile")
                    .font(AppTypography.label)
                    .foregroundColor(AppColor.primary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(AppColor.primary.opacity(0.12))
                    .clipShape(RoundedRectangle(cornerRadius: AppLayout.cornerRadius))
            }
        }
        .sheet(isPresented: $isEditPresented) {
            EditProfileSheet(
                fullName: $editFullName,
                username: $editUsername,
                bio: $editBio,
                onSave: {
                    Task {
                        await session.updateProfile(
                            fullName: editFullName,
                            username: editUsername,
                            bio: editBio
                        )
                        isEditPresented = false
                    }
                },
                onCancel: { isEditPresented = false }
            )
        }
    }

    private var statsGrid: some View {
        HStack(spacing: 10) {
            statCard(title: "Routes", value: "\(viewModel.routesCount)")
            statCard(title: "Sends", value: "\(viewModel.sendsCount)")
            statCard(title: "Likes", value: "\(viewModel.likesCount)")
        }
    }

    private var highlights: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Highlights")
                .font(AppTypography.headline)
                .foregroundColor(AppColor.text)
            Text(viewModel.highestGrade != nil ? "Highest grade: \(viewModel.highestGrade!)" : "No climbs logged yet")
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

    private var settingsRow: some View {
        NavigationLink {
            SettingsView()
        } label: {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Settings")
                        .font(AppTypography.headline)
                        .foregroundColor(AppColor.text)
                    Text("Account, data, and appearance")
                        .font(AppTypography.label)
                        .foregroundColor(AppColor.muted)
                }
                Spacer()
                Image(systemName: "chevron.right")
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
    }

    private func statCard(title: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(value)
                .font(AppTypography.headline)
                .foregroundColor(AppColor.text)
            Text(title)
                .font(AppTypography.label)
                .foregroundColor(AppColor.muted)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(AppColor.surface)
        .overlay(
            RoundedRectangle(cornerRadius: AppLayout.cornerRadius)
                .stroke(AppColor.border, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: AppLayout.cornerRadius))
    }
}

private struct EditProfileSheet: View {
    @Binding var fullName: String
    @Binding var username: String
    @Binding var bio: String
    let onSave: () -> Void
    let onCancel: () -> Void

    var body: some View {
        NavigationStack {
            ZStack {
                AppColor.background.ignoresSafeArea()
                VStack(spacing: 12) {
                    TextField("Full name", text: $fullName)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 10)
                        .background(AppColor.surface)
                        .overlay(
                            RoundedRectangle(cornerRadius: AppLayout.cornerRadius)
                                .stroke(AppColor.border, lineWidth: 1)
                        )

                    TextField("Username", text: $username)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 10)
                        .background(AppColor.surface)
                        .overlay(
                            RoundedRectangle(cornerRadius: AppLayout.cornerRadius)
                                .stroke(AppColor.border, lineWidth: 1)
                        )

                    TextEditor(text: $bio)
                        .frame(minHeight: 90)
                        .padding(8)
                        .background(AppColor.surface)
                        .overlay(
                            RoundedRectangle(cornerRadius: AppLayout.cornerRadius)
                                .stroke(AppColor.border, lineWidth: 1)
                        )
                    Spacer()
                }
                .padding(AppLayout.horizontalPadding)
            }
            .navigationTitle("Edit Profile")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", action: onCancel)
                        .foregroundColor(AppColor.muted)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save", action: onSave)
                        .foregroundColor(AppColor.primary)
                }
            }
        }
    }
}

struct ProfileView_Previews: PreviewProvider {
    static var previews: some View {
        ProfileView()
    }
}
