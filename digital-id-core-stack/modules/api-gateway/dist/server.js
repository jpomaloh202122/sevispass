"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const app = (0, express_1.default)();
const PORT = process.env.GATEWAY_PORT || 3004;
app.use((0, helmet_1.default)());
app.use(express_1.default.json());
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'api-gateway' });
});
app.listen(PORT, () => {
    console.log(`API Gateway running on port ${PORT}`);
});
//# sourceMappingURL=server.js.map