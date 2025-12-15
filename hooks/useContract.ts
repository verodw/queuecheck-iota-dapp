"use client"

import { useState, useEffect } from "react"
import {
  useCurrentAccount,
  useIotaClient,
  useSignAndExecuteTransaction,
  useIotaClientQuery,
} from "@iota/dapp-kit"
import { Transaction } from "@iota/iota-sdk/transactions"
import type { IotaObjectData } from "@iota/iota-sdk/client"
import { TESTNET_PACKAGE_ID } from "@/lib/config"

// ============================================================================
// CONTRACT CONFIGURATION
// ============================================================================

const PACKAGE_ID = TESTNET_PACKAGE_ID
export const CONTRACT_MODULE = "pizza"
export const CONTRACT_METHODS = {
  COOK: "cook",
} as const

// ============================================================================
// DATA EXTRACTION
// ============================================================================

function getObjectFields(data: IotaObjectData): { owner: string } | null {
  if (data.content?.dataType !== "moveObject") {
    console.log("Data is not a moveObject:", data.content?.dataType)
    return null
  }

  const fields = data.content.fields as any
  if (!fields) {
    console.log("No fields found in object data")
    return null
  }

  console.log("Object fields structure:", JSON.stringify(fields, null, 2))

  const owner = data.owner && typeof data.owner === "object" && "AddressOwner" in data.owner
    ? String(data.owner.AddressOwner)
    : ""

  return {
    owner,
  }
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export interface ContractData {
  owner: string
}

export interface ContractState {
  isLoading: boolean
  isPending: boolean
  isConfirming: boolean
  isConfirmed: boolean
  hash: string | undefined
  error: Error | null
}

export interface ContractActions {
  cook: (
    recipient: string,
    pepperoniAmounts: number[],
    sausageAmounts: number[],
    cheeseAmounts: number[],
    onionAmounts: number[],
    chivesAmounts: number[]
  ) => Promise<void>
  clearObject: () => void
}

export const useContract = () => {
  const currentAccount = useCurrentAccount()
  const address = currentAccount?.address
  const iotaClient = useIotaClient()
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction()
  const [objectId, setObjectId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hash, setHash] = useState<string | undefined>()
  const [transactionError, setTransactionError] = useState<Error | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.slice(1)
      if (hash) setObjectId(hash)
    }
  }, [])

  const { data, isPending: isFetching, error: queryError, refetch } = useIotaClientQuery(
    "getObject",
    {
      id: objectId!,
      options: { showContent: true, showOwner: true },
    },
    {
      enabled: !!objectId,
    }
  )

  const fields = data?.data ? getObjectFields(data.data) : null
  const isOwner = fields?.owner.toLowerCase() === address?.toLowerCase()

  const objectExists = !!data?.data
  const hasValidData = !!fields

  const cook = async (
    recipient: string,
    pepperoniAmounts: number[],
    sausageAmounts: number[],
    cheeseAmounts: number[],
    onionAmounts: number[],
    chivesAmounts: number[]
  ) => {
    try {
      setIsLoading(true)
      setTransactionError(null)
      setHash(undefined)
      const tx = new Transaction()
      tx.moveCall({
        arguments: [
          tx.pure.address(recipient),
          tx.pure.vector("u16", pepperoniAmounts),
          tx.pure.vector("u16", sausageAmounts),
          tx.pure.vector("u16", cheeseAmounts),
          tx.pure.vector("u16", onionAmounts),
          tx.pure.vector("u16", chivesAmounts)
        ],
        target: `${PACKAGE_ID}::${CONTRACT_MODULE}::${CONTRACT_METHODS.COOK}`,
      })

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: async ({ digest }) => {
            setHash(digest)
            try {
              const { effects } = await iotaClient.waitForTransaction({
                digest,
                options: { showEffects: true },
              })
              const newObjectId = effects?.created?.[0]?.reference?.objectId
              if (newObjectId) {
                setObjectId(newObjectId)
                if (typeof window !== "undefined") {
                  window.location.hash = newObjectId
                }
                setIsLoading(false)
              } else {
                setIsLoading(false)
                console.warn("No object ID found in transaction effects")
              }
            } catch (waitError) {
              console.error("Error waiting for transaction:", waitError)
              setIsLoading(false)
            }
          },
          onError: (err) => {
            const error = err instanceof Error ? err : new Error(String(err))
            setTransactionError(error)
            console.error("Error:", err)
            setIsLoading(false)
          },
        }
      )
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setTransactionError(error)
      console.error("Error cooking pizza:", err)
      setIsLoading(false)
    }
  }

  const contractData: ContractData | null = fields
    ? {
      owner: fields.owner,
    }
    : null

  const clearObject = () => {
    setObjectId(null)
    setTransactionError(null)
    if (typeof window !== "undefined") {
      window.location.hash = ""
    }
  }

  const actions: ContractActions = {
    cook,
    clearObject,
  }

  const contractState: ContractState = {
    isLoading: (isLoading && !objectId) || isPending || isFetching,
    isPending,
    isConfirming: false,
    isConfirmed: !!hash && !isLoading && !isPending,
    hash,
    error: queryError || transactionError,
  }

  return {
    data: contractData,
    actions,
    state: contractState,
    objectId,
    isOwner,
    objectExists,
    hasValidData,
  }
}