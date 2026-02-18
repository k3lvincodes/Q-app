# External Authentication API Documentation

This API allows external Q projects to authenticate users against the centralized database.

## Base URL

- **Development**: `http://localhost:3000/api`
- **Production**: `https://api.joinq.ng/api`

---

## Security & Authentication

### 1. API Key (Required)

All requests to this API must include the `x-api-key` header.

- **Header Name**: `x-api-key`
- **Value**: Your assigned project API Key.

**Example**:
```http
POST /auth/register HTTP/1.1
Host: api.joinq.ng
x-api-key: YOUR_SECURE_API_KEY
Content-Type: application/json
...
```

### 2. Rate Limiting

To prevent abuse, requests are rate-limited.

- **General API**: 5 requests per minute per IP address.
- **OTP Generation** (`/auth/register`, `/auth/login`, `/auth/otp`): **1 request per minute** per Email/IP.
- **Response**: `429 Too Many Requests` if the limit is exceeded.

---

## Endpoints

### 1. Register User

Registers a new user and sends an OTP to their email.

- **URL**: `/auth/register`
- **Method**: `POST`
- **Content-Type**: `application/json`

#### Request Body

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `email` | `string` | Yes | Valid email address. |
| `full_name` | `string` | Yes | User's full name (at least 2 words). |

#### Responses

- **200 OK**
    ```json
    {
      "message": "OTP sent successfully."
    }
    ```
- **400 Bad Request**
    ```json
    {
      "error": "Email and full_name are required."
    }
    ```
- **401 Unauthorized**
    ```json
    {
      "error": "Unauthorized: Invalid or missing API Key"
    }
    ```
- **409 Conflict**
    ```json
    {
      "error": "User already exists. Please login."
    }
    ```

---

### 2. Login User

Initiates login for an existing user by sending an OTP.

- **URL**: `/auth/login`
- **Method**: `POST`
- **Content-Type**: `application/json`

#### Request Body

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `email` | `string` | Yes | Valid email address. |

#### Responses

- **200 OK**
    ```json
    {
      "message": "OTP sent successfully."
    }
    ```
- **400 Bad Request**
    ```json
    {
      "error": "Email is required."
    }
    ```
- **401 Unauthorized**
    ```json
    {
      "error": "Unauthorized: Invalid or missing API Key"
    }
    ```

---

### 3. Verify OTP

Verifies the OTP sent to the user and returns session tokens.

- **URL**: `/auth/verify`
- **Method**: `POST`
- **Content-Type**: `application/json`

#### Request Body

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `email` | `string` | Yes | The email address. |
| `token` | `string` | Yes | The 6-digit OTP code. |
| `type` | `string` | No | OTP type. Use `'signup'` if verifying a registration to triggers profile updates. default: `'email'` |
| `full_name` | `string` | No | Required if `type` is `'signup'` to update the user's name. |

#### Responses

- **200 OK**
    ```json
    {
      "message": "Verification successful",
      "session": {
        "access_token": "eyJhbG...",
        "refresh_token": "ref_...",
        "expires_at": 170...,
        "user": {
          "id": "user_id",
          "email": "user@example.com",
          "user_metadata": { ... }
        }
      }
    }
    ```
- **400 Bad Request**
    ```json
    {
      "error": "Token has expired or is invalid"
    }
    ```
- **401 Unauthorized**
    ```json
    {
      "error": "Unauthorized: Invalid or missing API Key"
    }
    ```

---

### 4. Claim Gift

Allows an authenticated user to claim a gift using a gift code.

- **URL**: `/gifts/claim`
- **Method**: `POST`
- **Content-Type**: `application/json`
- **Headers**:
    - `x-api-key`: Your Project API Key.
    - `Authorization`: `Bearer <access_token>` (User session token obtained from `/verify`)

#### Request Body

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `gift_code` | `string` | Yes | The unique code of the gift to claim. |
| `password` | `string` | No | Required if the gift is password-protected. |

#### Responses

- **200 OK**
    ```json
    {
      "success": true,
      "message": "Gift claimed successfully",
      "amount": 100,
      "currency": "NGN",
      "id": "gift_uuid"
    }
    ```
- **400 Bad Request**
    ```json
    {
      "success": false,
      "error": "Gift code is required"
    }
    ```
- **401 Unauthorized**
    ```json
    {
      "success": false,
      "error": "User must be logged in"
    }
    ```
- **200 OK (Password Required)**
    - This occurs if the gift is password-protected and no password was provided.
    ```json
    {
      "success": false,
      "error": "Password required",
      "password_required": true,
      "hint": "The hint for the password"
    }
    ```
- **404 Not Found**
    ```json
    {
      "success": false,
      "error": "Gift not found"
    }
    ```
- **422 Unprocessable Entity**
    ```json
    {
      "success": false,
      "error": "Gift already claimed" 
    }
    ```
