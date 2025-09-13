export interface Credential {
    id: string;
    type: string;
    issuer: string;
    subject: string;
    issuanceDate: Date;
    expirationDate?: Date;
    claims: Record<string, any>;
}
export interface VerifiableCredential extends Credential {
    proof: {
        type: string;
        signature: string;
        created: Date;
    };
}
//# sourceMappingURL=index.d.ts.map