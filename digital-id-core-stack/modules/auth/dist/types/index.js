"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwoFactorError = exports.ValidationError = exports.AuthenticationError = void 0;
class AuthenticationError extends Error {
    constructor(message, code = 'AUTH_ERROR', statusCode = 401) {
        super(message);
        this.name = 'AuthenticationError';
        this.code = code;
        this.statusCode = statusCode;
    }
}
exports.AuthenticationError = AuthenticationError;
class ValidationError extends Error {
    constructor(message, code = 'VALIDATION_ERROR', statusCode = 400) {
        super(message);
        this.name = 'ValidationError';
        this.code = code;
        this.statusCode = statusCode;
    }
}
exports.ValidationError = ValidationError;
class TwoFactorError extends Error {
    constructor(message, code = 'TWO_FACTOR_ERROR', statusCode = 422) {
        super(message);
        this.name = 'TwoFactorError';
        this.code = code;
        this.statusCode = statusCode;
    }
}
exports.TwoFactorError = TwoFactorError;
//# sourceMappingURL=index.js.map