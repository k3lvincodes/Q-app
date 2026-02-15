# External Authentication API Documentation

This API allows external Q projects to authenticate users against the centralized database.

## Base URL

- **Development**: `http://localhost:3000/api/auth`
- **Production**: `https://api.joinq.ng/api/auth`

---

## Security & Authentication

### 1. API Key (Required)

All requests to this API must include the `x-api-key` header.

- **Header Name**: `x-api-key`
- **Value**: Your assigned project API Key.

**Example**:
```http
POST /register HTTP/1.1
Host: api.joinq.ng
x-api-key: YOUR_SECURE_API_KEY
Content-Type: application/json
...
```

### 2. Rate Limiting

To prevent abuse, requests are rate-limited.

- **Limit**: 5 requests per minute per IP address.
- **Response**: `429 Too Many Requests` if the limit is exceeded.

---

## Endpoints

### 1. Register User

Registers a new user and sends an OTP to their email.

- **URL**: `/register`
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

- **URL**: `/login`
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

- **URL**: `/verify`
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
