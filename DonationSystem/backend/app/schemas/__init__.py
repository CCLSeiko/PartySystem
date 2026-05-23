"""Schema package — re-export all schemas for convenience."""

from app.schemas.user import (
    UserRegisterRequest,
    UserLoginRequest,
    UserUpdateRequest,
    TaxConsentRequest,
    PasswordResetRequest,
    UserStatusUpdateRequest,
    UserResponse,
    UserLoginResponse,
    UserMinimal,
)

from app.schemas.donation import (
    CreateDonationRequest,
    DonationQueryParams,
    CancelDonationRequest,
    AdminDonationQueryParams,
    DonationListResponse,
    DonationDetailResponse,
    CreateDonationResponse,
    CancelDonationResponse,
    AdminDonationItem,
)

from app.schemas.payment import (
    CreditCardPaymentRequest,
    PostalPaymentRequest,
    CashPaymentRequest,
    CashConfirmRequest,
    CreditCardPaymentResponse,
    PostalPaymentResponse,
    CashPaymentResponse,
    CashConfirmResponse,
    PaymentStatusResponse,
)

from app.schemas.subscription import (
    CreateSubscriptionRequest,
    UpdateSubscriptionRequest,
    CancelSubscriptionRequest,
    SubscriptionResponse,
    CreateSubscriptionResponse,
    UpdateSubscriptionResponse,
    PauseResumeResponse,
    CancelSubscriptionResponse,
    SubscriptionHistoryItem,
)

from app.schemas.admin import (
    AdminSettingsRequest,
    AdminSettingsResponse,
    StatsResponse,
    ReconciliationUploadResponse,
    ReconciliationItem,
    ReconciliationDetailResponse,
    TaxSummaryResponse,
    Pagination,
    PaginatedResponse,
)

__all__ = [
    # User
    "UserRegisterRequest",
    "UserLoginRequest",
    "UserUpdateRequest",
    "TaxConsentRequest",
    "PasswordResetRequest",
    "UserStatusUpdateRequest",
    "UserResponse",
    "UserLoginResponse",
    "UserMinimal",
    # Donation
    "CreateDonationRequest",
    "DonationQueryParams",
    "CancelDonationRequest",
    "AdminDonationQueryParams",
    "DonationListResponse",
    "DonationDetailResponse",
    "CreateDonationResponse",
    "CancelDonationResponse",
    "AdminDonationItem",
    # Payment
    "CreditCardPaymentRequest",
    "PostalPaymentRequest",
    "CashPaymentRequest",
    "CashConfirmRequest",
    "CreditCardPaymentResponse",
    "PostalPaymentResponse",
    "CashPaymentResponse",
    "CashConfirmResponse",
    "PaymentStatusResponse",
    # Subscription
    "CreateSubscriptionRequest",
    "UpdateSubscriptionRequest",
    "CancelSubscriptionRequest",
    "SubscriptionResponse",
    "CreateSubscriptionResponse",
    "UpdateSubscriptionResponse",
    "PauseResumeResponse",
    "CancelSubscriptionResponse",
    "SubscriptionHistoryItem",
    # Admin
    "AdminSettingsRequest",
    "AdminSettingsResponse",
    "StatsResponse",
    "ReconciliationUploadResponse",
    "ReconciliationItem",
    "ReconciliationDetailResponse",
    "TaxSummaryResponse",
    "Pagination",
    "PaginatedResponse",
]
