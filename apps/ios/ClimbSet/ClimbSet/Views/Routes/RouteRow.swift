import SwiftUI
import Foundation

struct RouteRow: View {
    let route: Route

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .top, spacing: 12) {
                RoundedRectangle(cornerRadius: 12)
                    .fill(AppColor.border)
                    .frame(width: 56, height: 56)
                    .overlay(
                        Text("Wall")
                            .font(AppTypography.label)
                            .foregroundColor(AppColor.muted)
                    )

                VStack(alignment: .leading, spacing: 6) {
                    HStack(spacing: 8) {
                        Text(route.name)
                            .font(AppTypography.headline)
                            .foregroundColor(AppColor.text)
                            .lineLimit(1)
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
                    Text(metaText)
                        .font(AppTypography.label)
                        .foregroundColor(AppColor.muted)
                        .lineLimit(1)
                    HStack {
                        Text(metricsText)
                            .font(AppTypography.label)
                            .foregroundColor(AppColor.muted)
                        Spacer()
                        Text(timeAgo)
                            .font(AppTypography.label)
                            .foregroundColor(AppColor.muted.opacity(0.7))
                    }
                }
            }
        }
    }

    private var metaText: String {
        let setter = route.userName ?? "Setter"
        return setter
    }

    private var metricsText: String {
        let likes = route.likeCount ?? 0
        let sends = route.ascents.count
        if sends > 0 {
            return "\(likes) likes • \(sends) sends"
        }
        return "\(likes) likes"
    }

    private var timeAgo: String {
        let diff = Date().timeIntervalSince(parseDate(route.createdAt))
        let mins = Int(diff / 60)
        if mins < 60 { return "\(mins)m" }
        let hours = mins / 60
        if hours < 24 { return "\(hours)h" }
        let days = hours / 24
        if days < 7 { return "\(days)d" }
        return "\(days / 7)w"
    }

    private func parseDate(_ value: String) -> Date {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: value) {
            return date
        }
        let fallback = ISO8601DateFormatter()
        fallback.formatOptions = [.withInternetDateTime]
        if let date = fallback.date(from: value) {
            return date
        }
        return Date()
    }
}
