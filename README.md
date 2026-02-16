# Q App - Subscription Sharing & Social Gifting Platform

Q App is a utility-first platform designed to simplify digital subscription sharing and bill splitting among friends and communities. It also includes a social gifting layer, allowing users to send value and rewards seamlessly.

## 🚀 Core Features

### 1. Subscription Sharing & Management
-   **Credentials Sharing**: Securely share account access for Netflix, Spotify, and other digital services.
-   **Bill Splitting**: Automatically calculate and split subscription costs among group members.
-   **Access Control**: Manage who has access to shared accounts with time-based permissions.

### 2. Earnings & Wallet
-   **Host Earnings**: Earn money by sharing unused slots in your family plans or multi-user subscriptions.
-   **Wallet System**: Integrated wallet to receive payments, track earnings, and withdraw funds.
-   **Transaction History**: Detailed logs of all inflows (earnings, gifts) and outflows.

### 3. Social Gifting
-   **Digital Gifts**: Send monetary gifts or vouchers to friends and family.
-   **Claim System**: Recipients can securely claim gifts via unique codes (password-protected options available).
-   **External API**: Third-party integrations for creating and claiming gifts programmatically.

### 4. Authentication & Security
-   **OTP Login**: Passwordless, secure login via email OTP.
-   **Role-Based Access**: Granular permissions for Users vs. Admins.
-   **Security**: End-to-end encryption for shared credentials and rigorous API rate limiting.

## 🛠 Tech Stack

-   **Frontend**: React Native (Expo) / Next.js
-   **Backend**: Node.js & Express
-   **Database**: Supabase (PostgreSQL)
-   **Authentication**: Supabase Auth
-   **Language**: TypeScript

## 📂 Project Structure

-   `app/` - Frontend application code (Screens, Components).
-   `backend/` - Express backend server for external APIS.
-   `supabase/` - Database migrations and configuration.
-   `assets/` - Static assets (Images, Fonts).

## ⚡ Getting Started

### Prerequisites

-   **Node.js** (v18 or higher)
-   **npm** or **yarn**
-   **Expo CLI**

### 1. Frontend Setup

The frontend is built with Expo.

1.  Current directory is the root.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Set up environment variables in `.env`:
    ```env
    EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
    EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```
4.  Start the app:
    ```bash
    npx expo start
    ```

### 2. Backend Setup

The backend handles external API requests and secure transactions.

1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```
2.  Install backend dependencies:
    ```bash
    npm install
    ```
3.  Set up backend environment variables in `backend/.env`:
    ```env
    PORT=3000
    SUPABASE_URL=your_supabase_url
    SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
    EXTERNAL_API_KEY=your_secure_api_key
    DATABASE_URL=your_postgres_connection_string
    ```
4.  Start the server:
    ```bash
    npm run dev
    ```

## 📖 API Documentation

The backend provides a documented API for external interactions:
-   **Authentication**: `/auth/register`, `/auth/login`
-   **Gifting**: `/gifts/claim`

See [API_DOCUMENTATION.md](./backend/API_DOCUMENTATION.md) for full details.

## 🤝 Contributing

1.  Fork the repository.
2.  Create a feature branch (`git checkout -b feature/amazing-feature`).
3.  Commit your changes (`git commit -m 'Add amazing feature'`).
4.  Push to the branch (`git push origin feature/amazing-feature`).
5.  Open a Pull Request.

---

Built with ❤️ by the Q App Team.
