import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import crypto from 'crypto';
import WebSocket from 'ws';

// --- Configuration ---
const FONEPAY_API_BASE_URL_DEV = 'https://dev-merchantapi.fonepay.com/api';
const FONEPAY_API_BASE_URL_LIVE = 'https://merchantapi.fonepay.com/api';
const FONEPAY_WEBSOCKET_URL_DEV = 'wss://dev-ws.fonepay.com/convergent-webSocket-web/merchantEndPoint';
const FONEPAY_WEBSOCKET_URL_LIVE = 'wss://ws.fonepay.com/convergent-webSocket-web/merchantEndPoint';

// Fonepay credentials - Load these from environment variables
const MERCHANT_CODE = process.env.FONEPAY_MERCHANT_CODE || 'YOUR_MERCHANT_CODE';
const USERNAME = process.env.FONEPAY_USERNAME || 'YOUR_USERNAME';
const PASSWORD = process.env.FONEPAY_PASSWORD || 'YOUR_PASSWORD';
const SECRET_KEY = process.env.FONEPAY_SECRET_KEY || 'YOUR_SECRET_KEY';

// --- Helper Functions ---

/**
 * Generates an HMAC_SHA512 hash for data validation.
 * @param message The message string to hash.
 * @returns The HMAC_SHA512 hash as a hexadecimal string.
 */
async function generateHmacSHA512(message: string): Promise<string> {
    const hmac = crypto.createHmac('sha512', SECRET_KEY);
    hmac.update(message, 'utf8');
    return hmac.digest('hex');
}

/**
 * Constructs the data validation string for QR requests without tax refund.
 * @param amount Transaction amount.
 * @param prn Product number.
 * @param remarks1 First remark.
 * @param remarks2 Second remark.
 * @returns The concatenated string for HMAC.
 */
function getQrRequestHmacMessage(
    amount: string,
    prn: string,
    remarks1: string,
    remarks2: string
): string {
    // AMOUNT,PRN,MERCHANT-CODE,REMARKS1,REMARKS2 
    return `${amount},${prn},${MERCHANT_CODE},${remarks1},${remarks2}`;
}

/**
 * Constructs the data validation string for QR requests with tax refund.
 * @param amount Transaction amount.
 * @param prn Product number.
 * @param remarks1 First remark.
 * @param remarks2 Second remark.
 * @param taxAmount Tax amount.
 * @param taxRefund Tax refund amount.
 * @returns The concatenated string for HMAC.
 */
function getQrRequestHmacMessageWithTaxRefund(
    amount: string,
    prn: string,
    remarks1: string,
    remarks2: string,
    taxAmount: string,
    taxRefund: string
): string {
    // AMOUNT,PRN,MERCHANT-CODE,REMARKS1,REMARKS2,TAXAMOUNT,TAXREFUND 
    return `${amount},${prn},${MERCHANT_CODE},${remarks1},${remarks2},${taxAmount},${taxRefund}`;
}

/**
 * Constructs the data validation string for check QR requests.
 * @param prn Product number.
 * @returns The concatenated string for HMAC.
 */
function getCheckQrRequestHmacMessage(prn: string): string {
    // PRN,MERCHANT-CODE 
    return `${prn},${MERCHANT_CODE}`;
}

/**
 * Constructs the data validation string for post refund requests.
 * @param fonepayTraceId Fonepay Trace ID.
 * @param merchantPRN Merchant PRN.
 * @param invoiceNumber Invoice number.
 * @param invoiceDate Invoice date.
 * @param transactionAmount Transaction amount.
 * @returns The concatenated string for HMAC.
 */
function getPostRefundHmacMessage(
    fonepayTraceId: string,
    merchantPRN: string,
    invoiceNumber: string,
    invoiceDate: string,
    transactionAmount: string
): string {
    // fonepayTraceId,merchantPRN,invoiceNumber,invoiceDate,transactionAmount,merchantCode 
    return `${fonepayTraceId},${merchantPRN},${invoiceNumber},${invoiceDate},${transactionAmount},${MERCHANT_CODE}`;
}

// --- Fonepay API Interactions ---

interface QrRequestParams {
    amount: string; // N, 1-10, mandatory 
    remarks1: string; // AN, 1-25, mandatory 
    remarks2?: string; // AN, 1-25, mandatory (if needed) 
    prn: string; // ANS, 1-20, mandatory 
    taxAmount?: string; // Optional 
    taxRefund?: string; // Optional 
}

interface QrResponse {
    message: string;
    qrMessage: string;
    status: string;
    statusCode: number;
    success: boolean;
    thirdpartyQrWebSocketUrl: string;
}

/**
 * Sends a QR request to the Fonepay system.
 * @param params Parameters for the QR request.
 * @param isLive Whether to use the live environment.
 * @returns The QR response from Fonepay.
 */
export async function requestQrCode(params: QrRequestParams, isLive: boolean = false): Promise<QrResponse> {
    const baseUrl = isLive ? FONEPAY_API_BASE_URL_LIVE : FONEPAY_API_BASE_URL_DEV;
    const endpoint = `${baseUrl}/merchant/merchantDetailsForThirdParty/thirdPartyDynamicQrDownload`;
    const hmacMessage =
        params.taxAmount && params.taxRefund
            ? getQrRequestHmacMessageWithTaxRefund(
                params.amount,
                params.prn,
                params.remarks1,
                params.remarks2 || '',
                params.taxAmount,
                params.taxRefund
            )
            : getQrRequestHmacMessage(params.amount, params.prn, params.remarks1, params.remarks2 || '');

    const dataValidation = await generateHmacSHA512(hmacMessage);

    const requestBody = {
        amount: params.amount,
        remarks1: params.remarks1,
        remarks2: params.remarks2,
        prn: params.prn,
        merchantCode: MERCHANT_CODE,
        dataValidation: dataValidation,
        username: USERNAME,
        password: PASSWORD,
        ...(params.taxAmount && { taxAmount: params.taxAmount }),
        ...(params.taxRefund && { taxRefund: params.taxRefund }),
    };

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(`QR Request failed: ${errorBody.message || response.statusText}`);
    }

    return response.json();
}

interface CheckQrRequestParams {
    prn: string; // ANS, 1-50, mandatory 
}

interface CheckQrResponse {
    fonepayTraceId: number;
    merchantCode: string;
    paymentStatus: string;
    prn: string;
}

/**
 * Checks the status of a QR request.
 * Merchant can check QR request status if it doesn't get response from web socket connection. 
 * @param params Parameters for checking QR status.
 * @param isLive Whether to use the live environment.
 * @returns The QR status response from Fonepay.
 */
export async function checkQrStatus(params: CheckQrRequestParams, isLive: boolean = false): Promise<CheckQrResponse> {
    const baseUrl = isLive ? FONEPAY_API_BASE_URL_LIVE : FONEPAY_API_BASE_URL_DEV;
    const endpoint = `${baseUrl}/merchant/merchantDetailsForThirdParty/thirdPartyDynamicQrGetStatus`;
    const hmacMessage = getCheckQrRequestHmacMessage(params.prn);
    const dataValidation = await generateHmacSHA512(hmacMessage);

    const requestBody = {
        prn: params.prn,
        merchantCode: MERCHANT_CODE,
        dataValidation: dataValidation,
        username: USERNAME,
        password: PASSWORD,
    };

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(`Check QR Status failed: ${errorBody.message || response.statusText}`);
    }

    return response.json();
}

interface PostTaxRefundParams {
    fonepayTraceId: string; // N, mandatory 
    transactionAmount: string; // N, 1-10, mandatory 
    merchantPRN: string; // ANS, 1-20, mandatory 
    invoiceNumber: string; // ANS, 1-50, mandatory 
    invoiceDate: string; // AN, 10, mandatory (Nepali Date YYYY.MM.DD) 
}

interface PostTaxRefundResponse {
    fonepayTraceId: number;
    message: string;
    success: boolean;
}

/**
 * Initiates a post-tax refund request.
 * @param params Parameters for the post-tax refund request.
 * @param isLive Whether to use the live environment.
 * @returns The post-tax refund response from Fonepay.
 */
export async function postTaxRefund(params: PostTaxRefundParams, isLive: boolean = false): Promise<PostTaxRefundResponse> {
    const baseUrl = isLive ? FONEPAY_API_BASE_URL_LIVE : FONEPAY_API_BASE_URL_DEV;
    const endpoint = `${baseUrl}/merchant/merchantDetailsForThirdParty/thirdPartyPostTaxRefund`;
    const hmacMessage = getPostRefundHmacMessage(
        params.fonepayTraceId,
        params.merchantPRN,
        params.invoiceNumber,
        params.invoiceDate,
        params.transactionAmount
    );
    const dataValidation = await generateHmacSHA512(hmacMessage);

    const requestBody = {
        fonepayTraceId: params.fonepayTraceId,
        transactionAmount: params.transactionAmount,
        merchantPRN: params.merchantPRN,
        invoiceNumber: params.invoiceNumber,
        invoiceDate: params.invoiceDate,
        merchantCode: MERCHANT_CODE,
        dataValidation: dataValidation,
        username: USERNAME,
        password: PASSWORD,
    };

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(`Post Tax Refund failed: ${errorBody.message || response.statusText}`);
    }

    return response.json();
}

// --- WebSocket Integration ---

interface QrVerificationResponse {
    merchantId: number;
    deviceld: string;
    transactionStatus: {
        success: boolean;
        message: string;
        qrVerified: boolean;
    };
}

interface QrPaymentResponse {
    merchantId: number;
    deviceld: string;
    transactionStatus: {
        remarks1: string;
        remarks2: string;
        transactionDate: string;
        productNumber: string;
        amount: string;
        message: string;
        success: boolean;
        commissionType: string;
        commissionAmount: number;
        totalCalculatedAmount: number;
        paymentSuccess: boolean;
    };
}

type FonepayWebSocketEvent = QrVerificationResponse | QrPaymentResponse;

/**
 * Establishes a WebSocket connection to receive transaction acknowledgements.
 * @param webSocketUrl The WebSocket URL provided in the QR response.
 * @param onMessage Callback function for incoming messages.
 * @param onError Callback function for errors.
 * @param onClose Callback function for connection close.
 * @returns A WebSocket instance.
 */
export function establishFonepayWebSocket(
    webSocketUrl: string,
    onMessage: (data: FonepayWebSocketEvent) => void,
    onError: (event: Error) => void,
    onClose: (event: { code: number; reason: string }) => void
): WebSocket {
    const ws = new WebSocket(webSocketUrl);

    ws.on('open', () => {
        console.log('Fonepay WebSocket connected.');
    });

    ws.on('message', (data: Buffer) => {
        try {
            const parsedData: FonepayWebSocketEvent = JSON.parse(data.toString());
            onMessage(parsedData);
        } catch (e) {
            console.error('Error parsing WebSocket message:', e);
        }
    });

    ws.on('error', (error: Error) => {
        console.error('Fonepay WebSocket error:', error);
        onError(error);
    });

    ws.on('close', (code: number, reason: string) => {
        console.log('Fonepay WebSocket closed:', code, reason);
        onClose({ code, reason });
    });

    return ws;
}

// --- React Query Integration ---

export function useFonepayQrCode() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (params: QrRequestParams) => requestQrCode(params),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['fonepayQr'] });
            return data;
        },
    });
}

export function useFonepayQrStatus(params: CheckQrRequestParams) {
    return useQuery({
        queryKey: ['fonepayQrStatus', params.prn],
        queryFn: () => checkQrStatus(params),
        enabled: !!params.prn,
        refetchInterval: 5000, // Poll every 5 seconds
    });
}

export function useFonepayTaxRefund() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (params: PostTaxRefundParams) => postTaxRefund(params),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fonepayRefunds'] });
        },
    });
}

// Example usage in a React component:
/*
export function FonepayPayment() {
    const qrCodeMutation = useFonepayQrCode();
    const [prn, setPrn] = useState('');
    const qrStatus = useFonepayQrStatus({ prn });
    const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);

    const handleGenerateQr = async () => {
        try {
            const response = await qrCodeMutation.mutateAsync({
                amount: '100',
                remarks1: 'Test Payment',
                prn: `PRN_${Date.now()}`,
            });

            setPrn(response.prn);

            const ws = establishFonepayWebSocket(
                response.thirdpartyQrWebSocketUrl,
                (message) => {
                    if ('qrVerified' in message.transactionStatus) {
                        qrStatus.refetch();
                    }
                    if ('paymentSuccess' in message.transactionStatus) {
                        if (message.transactionStatus.paymentSuccess) {
                            // Handle success
                        }
                    }
                },
                (error) => console.error('WebSocket Error:', error),
                (event) => console.log('WebSocket Closed:', event)
            );

            setWsConnection(ws);
        } catch (error) {
            console.error('Failed to generate QR:', error);
        }
    };

    useEffect(() => {
        return () => {
            wsConnection?.close();
        };
    }, [wsConnection]);

    return (
        <div>
            <button 
                onClick={handleGenerateQr}
                disabled={qrCodeMutation.isPending}
            >
                Generate QR Code
            </button>

            {qrCodeMutation.data && (
                <div>
                    <p>Scan QR Code to Pay</p>
                    <QRCode value={qrCodeMutation.data.qrMessage} />
                </div>
            )}

            {qrStatus.data && (
                <div>
                    <p>Payment Status: {qrStatus.data.paymentStatus}</p>
                </div>
            )}
        </div>
    );
}
*/