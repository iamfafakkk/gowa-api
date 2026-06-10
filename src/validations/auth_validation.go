package validations

import (
	"context"

	domainAuth "github.com/aldinokemal/go-whatsapp-web-multidevice/domains/auth"
	pkgError "github.com/aldinokemal/go-whatsapp-web-multidevice/pkg/error"
	validation "github.com/go-ozzo/ozzo-validation/v4"
)

func ValidateAuthLogin(ctx context.Context, request domainAuth.LoginRequest) error {
	err := validation.ValidateStructWithContext(ctx, &request,
		validation.Field(&request.Username, validation.Required, validation.Length(1, 128)),
		validation.Field(&request.Password, validation.Required, validation.Length(1, 256)),
	)
	if err != nil {
		return pkgError.ValidationError(err.Error())
	}
	return nil
}

func ValidateAuthCreateUser(ctx context.Context, request domainAuth.CreateUserRequest) error {
	err := validation.ValidateStructWithContext(ctx, &request,
		validation.Field(&request.Username, validation.Required, validation.Length(1, 128)),
		validation.Field(&request.Password, validation.Required, validation.Length(8, 256)),
		validation.Field(&request.Role, validation.In("admin", "viewer")), // extensible
	)
	if err != nil {
		return pkgError.ValidationError(err.Error())
	}
	return nil
}

func ValidateAuthUpdatePassword(ctx context.Context, request domainAuth.UpdatePasswordRequest) error {
	err := validation.ValidateStructWithContext(ctx, &request,
		validation.Field(&request.Password, validation.Required, validation.Length(8, 256)),
	)
	if err != nil {
		return pkgError.ValidationError(err.Error())
	}
	return nil
}
