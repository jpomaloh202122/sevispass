"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DuplicateError = exports.DocumentError = exports.BiometricError = exports.VerificationError = void 0;
class VerificationError extends Error {
    constructor(message, code = 'VERIFICATION_ERROR', statusCode = 500) {
        super(message);
        this.name = 'VerificationError';
        this.code = code;
        this.statusCode = statusCode;
    }
}
exports.VerificationError = VerificationError;
class BiometricError extends Error {
    constructor(message, code = 'BIOMETRIC_ERROR', statusCode = 422) {
        super(message);
        this.name = 'BiometricError';
        this.code = code;
        this.statusCode = statusCode;
    }
}
exports.BiometricError = BiometricError;
class DocumentError extends Error {
    constructor(message, code = 'DOCUMENT_ERROR', statusCode = 422) {
        super(message);
        this.name = 'DocumentError';
        this.code = code;
        this.statusCode = statusCode;
    }
}
exports.DocumentError = DocumentError;
class DuplicateError extends Error {
    constructor(message, code = 'DUPLICATE_ERROR', statusCode = 409) {
        super(message);
        this.name = 'DuplicateError';
        this.code = code;
        this.statusCode = statusCode;
    }
}
exports.DuplicateError = DuplicateError;
//# sourceMappingURL=index.js.map