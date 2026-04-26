import SwiftUI

struct RootView: View {
    @StateObject private var session = AppSession()
    @StateObject private var routesViewModel = RoutesViewModel(repository: AppServices.routesRepository)

    var body: some View {
        TabView {
            NavigationStack {
                RoutesView()
            }
            .tabItem {
                Label("Routes", systemImage: "square.grid.2x2")
            }

            NavigationStack {
                EditorView()
            }
            .tabItem {
                Label("Editor", systemImage: "pencil.tip")
            }

            NavigationStack {
                if session.userId == nil {
                    AuthView()
                } else {
                    ProfileView()
                }
            }
            .tabItem {
                Label("Profile", systemImage: "person.crop.circle")
            }
        }
        .tint(AppColor.primary)
        .environmentObject(session)
        .environmentObject(routesViewModel)
        .task {
            await session.load()
        }
    }
}

struct RootView_Previews: PreviewProvider {
    static var previews: some View {
        RootView()
    }
}
