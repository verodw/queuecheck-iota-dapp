# 🚦 QueueCheck 

<p align="center">
  <img src="public/image/logo-qc.png" width="180" alt="QueueCheck Logo" />
</p>

<p align="center">
  <b>Real-Time Public Service Queue Tracking on IOTA MoveVM</b>
</p>

---

## Overview

**QueueCheck** is a decentralized application (dApp) built on the **IOTA Testnet**. It enables users to view and report real-time queue status for essential public services (Hospitals, Airports, Immigration, Banks, etc.) in a transparent, immutable, and decentralized manner.

Unlike traditional apps where data is stored on a central server, QueueCheck utilizes **IOTA Shared Objects**, ensuring that the queue data is publicly accessible and cannot be manipulated by a single entity.

---

## Features

* **Real-Time On-Chain Data:** Queue statuses are fetched directly from the IOTA Blockchain, not a database.
* **Shared Object Architecture:** Utilizes Move's *Shared Object* capability, allowing multiple concurrent users to read and update the same location data instantly.
* **Multi-Location Support:** Supports tracking for 6 distinct public sectors (Hospital, Immigration, Airport, City Hall, Bank, Clinic).
* **Local Persistence:** User submission history is securely saved in local storage for session tracking.

---

## Tech Stack

### Frontend
* **Framework:** [Next.js 14](https://nextjs.org/) (React)
* **Language:** TypeScript
* **Blockchain SDK:** `@iota/dapp-kit`, `@iota/iota-sdk`
* **Styling:** Custom CSS / Tailwind

### Smart Contract (Move)
* **Network:** IOTA Rebased Testnet
* **Concepts:** Shared Objects, Admin Capabilities (`AdminCap`), `iota::clock` for timestamping.

---

## How It Works

1.  **Object Creation:** An Admin creates a `Location` object (e.g., "Central General Hospital") on the IOTA network using a secured `AdminCap`. This object is shared publicly.
2.  **User Reporting:** Users physically at the location connect their IOTA Wallet.
3.  **Transaction Execution:** Users submit a `moveCall` transaction to the `update_queue` function.
4.  **Verification & Update:** The blockchain verifies the transaction and updates the `current_queue` and `estimated_wait` fields of the Shared Object.
5.  **Live Sync:** The frontend dApp automatically polls the blockchain to reflect the latest status to all connected users globally.

---

## Installation & Setup

If you want to run this project locally:

1.  **Clone the repository**
    ```bash
    git clone [https://github.com/verodw/queuecheck-iota-dapp.git](https://github.com/verodw/queuecheck-iota-dapp.git)
    cd queuecheck-iota-dapp
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment**
    Ensure you have the correct `PACKAGE_ID` in `app/components/QueueCheck.tsx` matching your deployed contract on IOTA Testnet.

4.  **Run the App**
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Smart Contract Structure

The core logic resides in `sources/queuecheck.move`. It defines:

* `struct Location`: A shared object holding the queue number, wait time, and timestamp.
* `struct AdminCap`: A capability allowing only the admin to create new locations to prevent spam.
* `public entry fun update_queue`: The main logic allowing public participation in updating the data.

---

## Acknowledgement

This project was developed for the **Build on IOTA Workshop – Jakarta**.
It serves as a demonstration of **IOTA Move fundamentals**: Object Ownership, Shared Objects, and dApp integration.