package types

type AnalyticsResponse struct {
	Date string `json:"date"`
	PV   int64  `json:"pv"`
	UV   int64  `json:"uv"`
}

type AnalyticsSummaryResponse struct {
	TotalPV   int64                `json:"total_pv"`
	TotalUV   int64                `json:"total_uv"`
	TodayPV   int64                `json:"today_pv"`
	TodayUV   int64                `json:"today_uv"`
	TrendData []AnalyticsResponse  `json:"trend_data"`
}
