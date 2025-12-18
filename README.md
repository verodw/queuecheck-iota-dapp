# 🚦 QueueCheck 

<p align="center">
  <img src="public/image/logo-qc.png" width="180" alt="QueueCheck Logo" />
</p>

<p align="center">
  <b>Decentralized "Report-to-Earn" Queue Tracking on IOTA MoveVM</b>
</p>

---

## Overview

**QueueCheck** is a decentralized application (dApp) built on the **IOTA Testnet**. It solves the problem of unpredictable waiting times at public services (Hospitals, Airports, Banks, etc.) by incentivizing the community to report real-time data. 
To ensure data accuracy and active participation, QueueCheck introduces a **"Report-to-Earn" mechanism**. Users are automatically rewarded with **$QUEUE tokens** every time they submit a valid queue report to the blockchain.

---

## Features

* ** Report-to-Earn System:** Users receive **1 $QUEUE Token** instantly for every successful update transaction.
* ** Multi-Location Tracking:** Supports tracking for 6 distinct public sectors (Hospital, Immigration, Airport, City Hall, Bank, Clinic).
* ** Real-Time On-Chain Data:** Data is stored directly on **IOTA Shared Objects**, ensuring transparency, immutability, and instant global sync.
* ** Wallet Integration:** Seamless connection with IOTA Wallet to sign transactions and view token balances.
* ** Powered by MoveVM:** Utilizes safe and efficient smart contract logic for atomic transactions.

---

## Tech Stack

* **Frontend:** [Next.js 14](https://nextjs.org/), TypeScript, Tailwind CSS
* **Blockchain:** IOTA MoveVM (Smart Contract)
* **SDK:** `@iota/dapp-kit`, `@iota/iota-sdk`
* **Deployment:** Vercel

---

## How It Works 

1.  **Setup:** The Admin creates `Location` objects and funds a `RewardPool` with **$QUEUE** tokens.
2.  **Report:** A user arrives at a location (e.g., Hospital), connects their wallet, and inputs the current queue number.
3.  **Execute:** The user submits a transaction via the Frontend using their IOTA Wallet.
4.  **Smart Contract Action :**
    * The contract updates the `Location` data on-chain.
    * The contract checks the `RewardPool` balance.
    * The contract **transfers 1 $QUEUE Token** from the pool to the user's wallet.
5.  **Result:** The UI updates instantly for everyone, and the user sees their coin balance increase.

---

## Smart Contract Structure

The core logic resides in `sources/queuecheck.move`. It manages:

* **`struct Location`**: A shared object holding the queue number, wait time, and timestamp.
* **`struct RewardPool`**: A "Vault" object that securely holds the supply of $QUEUE tokens to pay users.
* **`struct QUEUECHECK`**: The One-Time Witness (OTW) used to create the distinct currency.
* **`fun update_queue`**: The main entry function that updates data AND distributes rewards in a single step.

---

## Installation & Setup

If you want to run this project locally:

1.  **Clone the repository**
    ```bash
    git clone https://github.com/verodw/queuecheck-iota-dapp.git
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Run the App**
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Future Roadmap

Potential improvements for a production release:

* ✅ **Anti-Spam Cooldown:** Implementing a time-lock (e.g., 5 minutes) per user to prevent draining the reward pool.
* ✅ **Token Utility:** Enabling governance voting using $QUEUE tokens to let users decide on new locations.
* ✅ **Treasury Management:** Adding admin functions to refill the Reward Pool when funds run low.

---

## Acknowledgement

This project was developed by **Veronica Dwiyanti** for the **Build on IOTA Workshop – Jakarta**.
It serves as a demonstration of advanced IOTA concepts: *Shared Objects, Coin Standards, and Programmable Transaction Blocks (PTB).*
