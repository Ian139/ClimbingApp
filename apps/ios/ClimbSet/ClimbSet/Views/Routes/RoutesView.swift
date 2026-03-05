import SwiftUI

struct RoutesView: View {
    @StateObject private var viewModel = RoutesViewModel(repository: AppServices.routesRepository)
    @State private var selectedRoute: Route?

    var body: some View {
        ZStack {
            AppColor.background.ignoresSafeArea()

            VStack(spacing: 0) {
                header
                Divider().background(AppColor.border)
                content
            }
        }
        .task {
            await viewModel.load()
        }
        .sheet(item: $selectedRoute) { route in
            RouteDetailView(route: route)
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Routes")
                    .font(AppTypography.title)
                    .foregroundColor(AppColor.text)
                Spacer()
                Text("\(viewModel.filteredRoutes.count) routes")
                    .font(AppTypography.label)
                    .foregroundColor(AppColor.muted)
            }

            SearchField(text: $viewModel.searchText, placeholder: "Search routes, setters...")

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(SortOption.allCases) { option in
                        FilterChip(
                            title: option.rawValue,
                            isActive: viewModel.selectedSort == option
                        )
                        .onTapGesture { viewModel.selectedSort = option }
                    }
                }
                .padding(.vertical, 4)
            }
        }
        .padding(.horizontal, AppLayout.horizontalPadding)
        .padding(.top, 12)
        .padding(.bottom, 10)
    }

    private var content: some View {
        Group {
            if viewModel.isLoading {
                ProgressView()
                    .tint(AppColor.primary)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if viewModel.filteredRoutes.isEmpty {
                EmptyStateView(
                    title: "No routes yet",
                    subtitle: "Create your first route to get started."
                )
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    LazyVStack(spacing: 0) {
                        ForEach(viewModel.filteredRoutes) { route in
                            RouteRow(route: route)
                                .contentShape(Rectangle())
                                .onTapGesture {
                                    selectedRoute = route
                                }
                                .padding(.horizontal, AppLayout.horizontalPadding)
                                .padding(.vertical, 12)
                            Divider().background(AppColor.border)
                        }
                    }
                }
            }
        }
    }
}

struct RoutesView_Previews: PreviewProvider {
    static var previews: some View {
        RoutesView()
    }
}
