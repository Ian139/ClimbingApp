import SwiftUI

struct EditorView: View {
    @EnvironmentObject var session: AppSession
    @StateObject private var wallsViewModel = WallsViewModel()
    @State private var holds: [Hold] = []
    @State private var selectedType: HoldType = .hand
    @State private var selectedSize: HoldSize = .medium
    @State private var showSequence = false
    @State private var routeName = ""
    @State private var routeGrade = ""
    @State private var isSavePresented = false
    @State private var isWallPickerPresented = false

    var body: some View {
        ZStack {
            AppColor.background.ignoresSafeArea()

            VStack(spacing: 0) {
                header
                Divider().background(AppColor.border)
                wallCanvas
                controls
            }
        }
        .sheet(isPresented: $isSavePresented) {
            SaveRouteSheet(
                routeName: $routeName,
                routeGrade: $routeGrade,
                holdsCount: holds.count,
                onSave: { isSavePresented = false },
                onCancel: { isSavePresented = false }
            )
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Editor")
                    .font(AppTypography.title)
                    .foregroundColor(AppColor.text)
                Spacer()
                Button {
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
                .disabled(holds.isEmpty)
                .opacity(holds.isEmpty ? 0.4 : 1)
            }

            Button {
                isWallPickerPresented = true
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "rectangle.3.offgrid")
                        .font(.system(size: 12, weight: .semibold))
                    Text(selectedWallName)
                        .font(AppTypography.label)
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
        }
        .padding(.horizontal, AppLayout.horizontalPadding)
        .padding(.vertical, 12)
        .sheet(isPresented: $isWallPickerPresented) {
            WallPickerView(viewModel: wallsViewModel)
                .environmentObject(session)
        }
        .task {
            await wallsViewModel.load(userId: session.userId)
        }
    }

    private var wallCanvas: some View {
        GeometryReader { proxy in
            ZStack {
                RoundedRectangle(cornerRadius: AppLayout.cornerRadius)
                    .fill(AppColor.surface)
                    .overlay(
                        RoundedRectangle(cornerRadius: AppLayout.cornerRadius)
                            .stroke(AppColor.border, lineWidth: 1)
                    )

                if let wall = selectedWall, let urlString = wall.imageUrl, let url = URL(string: urlString) {
                    AsyncImage(url: url) { image in
                        image.resizable().scaledToFill()
                    } placeholder: {
                        Color.clear
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .clipShape(RoundedRectangle(cornerRadius: AppLayout.cornerRadius))
                }

                if holds.isEmpty {
                    VStack(spacing: 8) {
                        Text(selectedWall == nil ? "Select a wall" : "Tap to place holds")
                            .font(AppTypography.headline)
                            .foregroundColor(AppColor.text)
                        Text(selectedWall == nil ? "Add one in Walls" : "Long press a hold to remove")
                            .font(AppTypography.label)
                            .foregroundColor(AppColor.muted)
                    }
                }

                ForEach(holds) { hold in
                    holdView(for: hold)
                        .position(
                            x: hold.x * proxy.size.width,
                            y: hold.y * proxy.size.height
                        )
                        .onLongPressGesture {
                            holds.removeAll { $0.id == hold.id }
                        }
                }
            }
            .contentShape(Rectangle())
            .onTapGesture { location in
                guard selectedWall != nil else { return }
                let x = max(0.02, min(0.98, location.x / proxy.size.width))
                let y = max(0.02, min(0.98, location.y / proxy.size.height))
                let sequence = showSequence ? holds.count + 1 : nil
                let newHold = Hold(
                    id: UUID().uuidString,
                    x: x,
                    y: y,
                    type: selectedType,
                    color: holdHex(for: selectedType),
                    sequence: sequence,
                    size: selectedSize,
                    notes: nil
                )
                holds.append(newHold)
            }
        }
        .padding(AppLayout.horizontalPadding)
        .padding(.vertical, 12)
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
                Text(typeLabel(hold.type))
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

    private func holdHex(for type: HoldType) -> String {
        switch type {
        case .start: return "#10b981"
        case .hand: return "#ef4444"
        case .foot: return "#3b82f6"
        case .finish: return "#f59e0b"
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
}

struct SaveRouteSheet: View {
    @Binding var routeName: String
    @Binding var routeGrade: String
    let holdsCount: Int
    let onSave: () -> Void
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
                    Button("Save", action: onSave)
                        .foregroundColor(AppColor.primary)
                        .disabled(routeName.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
    }
}

struct EditorView_Previews: PreviewProvider {
    static var previews: some View {
        EditorView()
    }
}
