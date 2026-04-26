import SwiftUI

struct EditorView: View {
    @EnvironmentObject var session: AppSession
    @EnvironmentObject var routesViewModel: RoutesViewModel
    @StateObject private var wallsViewModel = WallsViewModel()
    @State private var holds: [Hold] = []
    @State private var selectedType: HoldType = .hand
    @State private var selectedSize: HoldSize = .medium
    @State private var showSequence = false
    @State private var routeName = ""
    @State private var routeGrade = ""
    @State private var isSavePresented = false
    @State private var isWallPickerPresented = false
    @State private var isSaving = false
    @State private var saveErrorMessage: String? = nil

    var body: some View {
        ZStack {
            AppColor.background.ignoresSafeArea()

            VStack(spacing: 0) {
                header
                Divider().background(AppColor.border)
                wallCanvas
                controls
                Spacer(minLength: 0)
            }
        }
        .sheet(isPresented: $isSavePresented) {
            SaveRouteSheet(
                routeName: $routeName,
                routeGrade: $routeGrade,
                holdsCount: holds.count,
                isSaving: isSaving,
                errorMessage: saveErrorMessage,
                onSave: { await saveRoute() },
                onCancel: { isSavePresented = false }
            )
        }
    }

    private var header: some View {
        HStack(spacing: 10) {
            Text("Editor")
                .font(AppTypography.title)
                .foregroundColor(AppColor.text)
                .lineLimit(1)
            Button {
                isWallPickerPresented = true
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "rectangle.3.offgrid")
                        .font(.system(size: 12, weight: .semibold))
                    Text(selectedWallName)
                        .font(AppTypography.label)
                        .lineLimit(1)
                }
                .foregroundColor(AppColor.muted)
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(AppColor.surface)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(AppColor.border, lineWidth: 1)
                )
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }

            Spacer(minLength: 4)

            Button {
                saveErrorMessage = nil
                isSavePresented = true
            } label: {
                Text("Save")
                    .font(AppTypography.label)
                    .foregroundColor(AppColor.primary)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(AppColor.primary.opacity(0.12))
                    .clipShape(Capsule())
            }
            .disabled(holds.isEmpty || selectedWall == nil)
            .opacity((holds.isEmpty || selectedWall == nil) ? 0.4 : 1)
        }
        .padding(.horizontal, AppLayout.horizontalPadding)
        .padding(.top, 8)
        .padding(.bottom, 8)
        .frame(maxWidth: AppLayout.contentMaxWidth)
        .frame(maxWidth: .infinity)
        .sheet(isPresented: $isWallPickerPresented) {
            WallPickerView(viewModel: wallsViewModel)
                .environmentObject(session)
        }
        .task {
            await wallsViewModel.load(userId: session.userId)
        }
    }

    private var wallCanvas: some View {
        ZStack {
            RoundedRectangle(cornerRadius: AppLayout.cornerRadius)
                .fill(AppColor.surface)
                .overlay(
                    RoundedRectangle(cornerRadius: AppLayout.cornerRadius)
                        .stroke(AppColor.border, lineWidth: 1)
                )

            wallImage

            if holds.isEmpty {
                VStack(spacing: 8) {
                    Text(selectedWall == nil ? "Select a wall" : "Tap to place holds")
                        .font(AppTypography.headline)
                        .foregroundColor(AppColor.text)
                    Text(selectedWall == nil ? "Add one in Walls" : "Long press a hold to remove")
                        .font(AppTypography.label)
                        .foregroundColor(AppColor.muted)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(AppColor.surface.opacity(0.86))
                .clipShape(RoundedRectangle(cornerRadius: 14))
            }

            GeometryReader { proxy in
                ZStack {
                    Color.clear

                    ForEach(holds) { hold in
                        holdView(for: hold)
                            .position(
                                x: hold.normalizedX * proxy.size.width,
                                y: hold.normalizedY * proxy.size.height
                            )
                            .onLongPressGesture {
                                holds.removeAll { $0.id == hold.id }
                            }
                    }
                }
                .contentShape(Rectangle())
                .onTapGesture { location in
                    guard selectedWall != nil else { return }
                    let x = max(2, min(98, (location.x / proxy.size.width) * 100))
                    let y = max(2, min(98, (location.y / proxy.size.height) * 100))
                    let sequence = showSequence ? holds.count + 1 : nil
                    let newHold = Hold(
                        id: UUID().uuidString,
                        x: x,
                        y: y,
                        type: selectedType,
                        color: selectedType.colorHex,
                        sequence: sequence,
                        size: selectedSize,
                        notes: nil
                    )
                    holds.append(newHold)
                }
            }
        }
        .aspectRatio(wallAspectRatio, contentMode: .fit)
        .clipShape(RoundedRectangle(cornerRadius: AppLayout.cornerRadius))
        .padding(.horizontal, AppLayout.horizontalPadding)
        .padding(.top, 8)
        .padding(.bottom, 8)
        .frame(maxWidth: AppLayout.editorMaxWidth)
        .frame(maxWidth: .infinity)
    }

    @ViewBuilder
    private var wallImage: some View {
        if let url = selectedWallImageURL {
            AsyncImage(url: url) { phase in
                switch phase {
                case .empty:
                    placeholderWall
                case .success(let image):
                    image
                        .resizable()
                        .scaledToFill()
                case .failure:
                    placeholderWall
                @unknown default:
                    placeholderWall
                }
            }
        } else if selectedWall != nil {
            placeholderWall
        }
    }

    private var placeholderWall: some View {
        Image("DefaultWall")
            .resizable()
            .scaledToFill()
    }

    private var controls: some View {
        VStack(spacing: 12) {
            HStack(spacing: 8) {
                ForEach(HoldType.allCases, id: \.self) { type in
                    FilterChip(title: typeLabel(type), isActive: selectedType == type)
                        .onTapGesture { selectedType = type }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            HStack(spacing: 10) {
                ForEach(HoldSize.allCases, id: \.self) { size in
                    FilterChip(title: sizeLabel(size), isActive: selectedSize == size)
                        .onTapGesture { selectedSize = size }
                }
                Spacer()
                Toggle("Sequence", isOn: $showSequence)
                    .font(AppTypography.label)
                    .toggleStyle(SwitchToggleStyle(tint: AppColor.primary))
            }
        }
        .padding(.horizontal, AppLayout.horizontalPadding)
        .padding(.bottom, 16)
        .frame(maxWidth: AppLayout.contentMaxWidth)
        .frame(maxWidth: .infinity)
    }

    private func holdView(for hold: Hold) -> some View {
        let size = holdSizeValue(hold.size)
        return ZStack {
            Circle()
                .stroke(Color.hex(hold.color), lineWidth: 3)
                .background(
                    Circle().fill(Color.hex(hold.color).opacity(0.2))
                )
                .frame(width: size, height: size)
            if let sequence = hold.sequence {
                Text("\(sequence)")
                    .font(.system(size: size * 0.35, weight: .bold))
                    .foregroundColor(AppColor.text)
            } else {
                Text(hold.type.shortLabel)
                    .font(.system(size: size * 0.35, weight: .bold))
                    .foregroundColor(AppColor.text)
            }
        }
    }

    private func holdSizeValue(_ size: HoldSize) -> CGFloat {
        switch size {
        case .small: return 16
        case .medium: return 24
        case .large: return 36
        }
    }

    private func typeLabel(_ type: HoldType) -> String {
        switch type {
        case .start: return "S"
        case .hand: return "H"
        case .foot: return "F"
        case .finish: return "T"
        }
    }

    private func sizeLabel(_ size: HoldSize) -> String {
        switch size {
        case .small: return "Small"
        case .medium: return "Medium"
        case .large: return "Large"
        }
    }

    private var selectedWallName: String {
        if let id = wallsViewModel.selectedWallId,
           let wall = wallsViewModel.walls.first(where: { $0.id == id }) {
            return "Wall: \(wall.name)"
        }
        return "Select wall"
    }

    private var selectedWall: Wall? {
        guard let id = wallsViewModel.selectedWallId else { return nil }
        return wallsViewModel.walls.first(where: { $0.id == id })
    }

    private var selectedWallImageURL: URL? {
        guard let urlString = selectedWall?.imageUrl?.trimmingCharacters(in: .whitespacesAndNewlines),
              !urlString.isEmpty,
              !urlString.hasPrefix("/") else {
            return nil
        }
        return URL(string: urlString)
    }

    private var wallAspectRatio: CGFloat {
        guard
            let wall = selectedWall,
            let width = wall.imageWidth,
            let height = wall.imageHeight,
            width > 0,
            height > 0,
            selectedWallImageURL != nil
        else {
            return AppLayout.defaultWallAspectRatio
        }

        return CGFloat(width) / CGFloat(height)
    }

    private func saveRoute() async {
        guard let wall = selectedWall else {
            saveErrorMessage = "Select a wall before saving."
            return
        }

        let trimmedName = routeName.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedGrade = routeGrade.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedName.isEmpty else {
            saveErrorMessage = "Add a route name before saving."
            return
        }

        isSaving = true
        saveErrorMessage = nil
        defer { isSaving = false }

        do {
            try await routesViewModel.createRoute(
                name: trimmedName,
                gradeV: trimmedGrade.isEmpty ? nil : trimmedGrade,
                holds: holds,
                wall: wall,
                userId: session.userId,
                userName: session.displayName
            )
            routeName = ""
            routeGrade = ""
            holds = []
            showSequence = false
            isSavePresented = false
        } catch {
            saveErrorMessage = error.localizedDescription
        }
    }
}

struct SaveRouteSheet: View {
    @Binding var routeName: String
    @Binding var routeGrade: String
    let holdsCount: Int
    let isSaving: Bool
    let errorMessage: String?
    let onSave: () async -> Void
    let onCancel: () -> Void

    var body: some View {
        NavigationStack {
            ZStack {
                AppColor.background.ignoresSafeArea()
                VStack(alignment: .leading, spacing: 16) {
                    TextField("Route name", text: $routeName)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 10)
                        .background(AppColor.surface)
                        .overlay(
                            RoundedRectangle(cornerRadius: AppLayout.cornerRadius)
                                .stroke(AppColor.border, lineWidth: 1)
                        )
                        .font(AppTypography.body)

                    TextField("Grade (e.g. V4)", text: $routeGrade)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 10)
                        .background(AppColor.surface)
                        .overlay(
                            RoundedRectangle(cornerRadius: AppLayout.cornerRadius)
                                .stroke(AppColor.border, lineWidth: 1)
                        )
                        .font(AppTypography.body)

                    Text("\(holdsCount) holds placed")
                        .font(AppTypography.label)
                        .foregroundColor(AppColor.muted)

                    if let errorMessage, !errorMessage.isEmpty {
                        Text(errorMessage)
                            .font(AppTypography.label)
                            .foregroundColor(AppColor.destructive)
                    }

                    if isSaving {
                        ProgressView()
                            .tint(AppColor.primary)
                    }
                    Spacer()
                }
                .padding(AppLayout.horizontalPadding)
            }
            .navigationTitle("Save Route")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", action: onCancel)
                        .foregroundColor(AppColor.muted)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button {
                        Task { await onSave() }
                    } label: {
                        Text(isSaving ? "Saving..." : "Save")
                    }
                        .foregroundColor(AppColor.primary)
                        .disabled(routeName.trimmingCharacters(in: .whitespaces).isEmpty || isSaving)
                }
            }
        }
    }
}

struct EditorView_Previews: PreviewProvider {
    static var previews: some View {
        EditorView()
            .environmentObject(AppSession())
            .environmentObject(RoutesViewModel(repository: MockRoutesRepository()))
    }
}
