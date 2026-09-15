export const ANDROID_KOTLIN_CODE = {
  dto: `// [Phase 4] Android Kotlin Data Classes (DTO)
package com.example.ktxsniper.data.model

import com.google.gson.annotations.SerializedName

data class KorailCredential(
    @SerializedName("membership_number") val membershipNumber: String,
    @SerializedName("password") val password: String
)

data class ScheduleSearchRequest(
    @SerializedName("departure_station") val departureStation: String,
    @SerializedName("arrival_station") val arrivalStation: String,
    @SerializedName("date") val date: String, // "20260910"
    @SerializedName("time") val time: String = "090000",
    @SerializedName("passengers") val passengers: Int = 1
)

data class TrainScheduleItem(
    @SerializedName("train_number") val trainNumber: String,
    @SerializedName("train_type") val trainType: String,
    @SerializedName("departure_time") val departureTime: String,
    @SerializedName("arrival_time") val arrivalTime: String,
    @SerializedName("duration") val duration: String,
    @SerializedName("departure_station") val departureStation: String,
    @SerializedName("arrival_station") val arrivalStation: String,
    @SerializedName("general_seat_status") val generalSeatStatus: String, // "SOLD_OUT" or "AVAILABLE"
    @SerializedName("special_seat_status") val specialSeatStatus: String,
    @SerializedName("general_price") val generalPrice: Int,
    @SerializedName("special_price") val specialPrice: Int
)

data class TargetTrainItem(
    @SerializedName("train_number") val trainNumber: String,
    @SerializedName("train_type") val trainType: String,
    @SerializedName("departure_time") val departureTime: String,
    @SerializedName("arrival_time") val arrivalTime: String,
    @SerializedName("seat_preference") val seatPreference: String // "NORMAL", "SPECIAL", "ANY"
)

data class SniperStartRequest(
    @SerializedName("departure_station") val departureStation: String,
    @SerializedName("arrival_station") val arrivalStation: String,
    @SerializedName("date") val date: String,
    @SerializedName("time") val time: String = "090000",
    @SerializedName("passengers") val passengers: Int = 1,
    @SerializedName("targets") val targets: List<TargetTrainItem>, // 사용자가 시간표에서 선택한 열차들!
    @SerializedName("credential") val credential: KorailCredential,
    @SerializedName("min_jitter") val minJitter: Double = 1.3,
    @SerializedName("max_jitter") val maxJitter: Double = 2.2,
    @SerializedName("telegram_bot_token") val telegramBotToken: String? = null,
    @SerializedName("telegram_chat_id") val telegramChatId: String? = null,
    @SerializedName("auto_logout_on_success") val autoLogoutOnSuccess: Boolean = true
)

data class ReservedTicketInfo(
    @SerializedName("reservation_number") val reservationNumber: String,
    @SerializedName("train_number") val trainNumber: String,
    @SerializedName("train_type") val trainType: String,
    @SerializedName("departure_station") val departureStation: String,
    @SerializedName("arrival_station") val arrivalStation: String,
    @SerializedName("departure_time") val departureTime: String,
    @SerializedName("arrival_time") val arrivalTime: String,
    @SerializedName("seat_info") val seatInfo: String,
    @SerializedName("seat_type") val seatType: String,
    @SerializedName("payment_deadline") val paymentDeadline: String,
    @SerializedName("total_price") val totalPrice: Int
)

data class SniperStatusResponse(
    @SerializedName("is_running") val isRunning: Boolean,
    @SerializedName("status") val status: String,
    @SerializedName("targets_count") val targetsCount: Int,
    @SerializedName("target_summary") val targetSummary: String?,
    @SerializedName("poll_count") val pollCount: Int,
    @SerializedName("last_latency_ms") val lastLatencyMs: Double?,
    @SerializedName("reserved_ticket") val reservedTicket: ReservedTicketInfo?
)
`,
  retrofit: `// [Phase 4] Retrofit2 REST API Interface
package com.example.ktxsniper.data.api

import com.example.ktxsniper.data.model.*
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

interface KtxSniperApi {
    // 1. 시간표 목록 조회 (사용자 선택용)
    @POST("api/v1/sniper/search-schedules")
    suspend fun searchSchedules(
        @Body request: ScheduleSearchRequest
    ): Response<List<TrainScheduleItem>>

    // 2. 선택된 열차/좌석 대상 스나이퍼 시작
    @POST("api/v1/sniper/start")
    suspend fun startSniper(
        @Body request: SniperStartRequest
    ): Response<SniperStatusResponse>

    // 3. 스나이퍼 중지
    @POST("api/v1/sniper/stop")
    suspend fun stopSniper(): Response<SniperStatusResponse>

    // 4. 상태 조회
    @GET("api/v1/sniper/status")
    suspend fun getStatus(): Response<SniperStatusResponse>
}
`,
  viewModel: `// [Phase 4] ViewModel - 시간표 조회 및 타겟 선택 관리
package com.example.ktxsniper.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.ktxsniper.data.api.KtxSniperApi
import com.example.ktxsniper.data.model.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class SniperViewModel(private val api: KtxSniperApi) : ViewModel() {
    // 1. 시간표 목록 상태
    private val _schedules = MutableStateFlow<List<TrainScheduleItem>>(emptyList())
    val schedules = _schedules.asStateFlow()

    // 2. 사용자가 선택한 타겟 목록
    private val _selectedTargets = MutableStateFlow<List<TargetTrainItem>>(emptyList())
    val selectedTargets = _selectedTargets.asStateFlow()

    // 3. 스나이퍼 실행 상태
    private val _status = MutableStateFlow<SniperStatusResponse?>(null)
    val status = _status.asStateFlow()

    fun fetchSchedules(dep: String, arr: String, date: String, time: String) {
        viewModelScope.launch {
            try {
                val res = api.searchSchedules(ScheduleSearchRequest(dep, arr, date, time))
                if (res.isSuccessful) {
                    _schedules.value = res.body() ?: emptyList()
                }
            } catch (e: Exception) {
                // 에러 처리
            }
        }
    }

    // 열차 및 좌석등급(일반/특실) 토글 선택
    fun toggleTarget(train: TrainScheduleItem, seatPref: String) {
        val current = _selectedTargets.value.toMutableList()
        val existingIndex = current.indexOfFirst { it.trainNumber == train.trainNumber }

        if (existingIndex >= 0) {
            val existing = current[existingIndex]
            if (existing.seatPreference == seatPref) {
                current.removeAt(existingIndex) // 해제
            } else {
                current[existingIndex] = existing.copy(seatPreference = seatPref) // 등급 변경
            }
        } else {
            current.add(TargetTrainItem(
                trainNumber = train.trainNumber,
                trainType = train.trainType,
                departureTime = train.departureTime,
                arrivalTime = train.arrivalTime,
                seatPreference = seatPref
            ))
        }
        _selectedTargets.value = current
    }

    fun startSniper(credential: KorailCredential) {
        val targets = _selectedTargets.value
        if (targets.isEmpty()) return

        viewModelScope.launch {
            val req = SniperStartRequest(
                departureStation = targets.first().let { _schedules.value.first().departureStation },
                arrivalStation = targets.first().let { _schedules.value.first().arrivalStation },
                date = "20260910",
                targets = targets,
                credential = credential
            )
            val res = api.startSniper(req)
            if (res.isSuccessful) {
                _status.value = res.body()
            }
        }
    }
}
`
};
