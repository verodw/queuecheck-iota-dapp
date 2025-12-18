"use client"
import { useState, useEffect } from "react"
import { 
  ConnectModal, 
  useCurrentAccount, 
  useDisconnectWallet, 
  useSignAndExecuteTransaction,
  useIotaClient 
} from "@iota/dapp-kit"
import { Transaction } from "@iota/iota-sdk/transactions"

// --- SMART CONTRACT CONFIGURATION ---
const PACKAGE_ID = "0xd2b29c28e058c33e6fe5212665a0d6f4fb74ae3c533127e289c36993aa157972"; 
const REWARD_POOL_ID = "0x4cb6096d8c5ce564c959b2b7929ffe717fd926bca15b563df9fbcf5e78a071a8"; 
const LOCATION_OBJECTS = [
  "0x001ccca21647c21373f045617876f4bbea3428622be5e15fadbc1608eac23641", // Central General Hospital
  "0x586ccd6a281cf605bb9e05ccdc7e844c30d0bceecbd47dcdb183882e1bee7c8f", // Immigration Office Downtown
  "0x33d198cb253a18565d1bdae11c1195aa405dce42a57e8e3d3dda7bbeaecade94", // International Airport T3
  "0xdb083203e63f71fc76c008f702412bc5025777cc2a39dd5a26ab53cd563eb192", // City Hall Services
  "0xe665e8177537167037d70a9e42682b5bcdfb01ca343185edce79428df49f9ee9", // National Bank Main Branch
  "0xd04993a5658dfaa886f298b0bb41684bb48942879b06a4133cbe54312243aaa6", // Community Health Clinic
];
const MODULE_NAME = "queuecheck";
const CLOCK_OBJECT_ID = "0x6"; 

const COLORS = {
  primary: "#e05142",   
  secondary: "#2a6350", 
  accent: "#f2be4b",   
  textMain: "#2d2d2d",  
  textLight: "#ffffff", 
  bgGradient: "linear-gradient(135deg, #FFF8E1 0%, #FFECB3 100%)", 
}

interface QueueLocation {
  id: string
  name: string
  type: string
  currentQueue: number
  estimatedWait: number
  lastUpdate: string
  icon: string
  reporter: string
}

interface LocalReport {
  id: string
  locationName: string
  queueNumber: number
  estimatedWait: number
  timestamp: string
  txHash: string
}

const QueueCheck = () => {
  const client = useIotaClient()
  const currentAccount = useCurrentAccount()
  const { mutate: disconnectWallet } = useDisconnectWallet()
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction()
  
  const [locations, setLocations] = useState<QueueLocation[]>([])
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null)
  const [queueNumber, setQueueNumber] = useState("")
  const [estimatedWait, setEstimatedWait] = useState("")
  
  const [userBalance, setUserBalance] = useState<string>("0")
  
  const [isPending, setIsPending] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [lastTxDigest, setLastTxDigest] = useState("")
  const [myReports, setMyReports] = useState<LocalReport[]>([])
  const [showMyReports, setShowMyReports] = useState(false)

  const isConnected = !!currentAccount

  useEffect(() => {
    const savedReports = localStorage.getItem("queuecheck_history");
    if (savedReports) {
      try {
        setMyReports(JSON.parse(savedReports));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  const fetchBalance = async () => {
    if (!currentAccount) return;
    try {
      const coinBalance = await client.getBalance({
        owner: currentAccount.address,
        coinType: `${PACKAGE_ID}::queuecheck::QUEUECHECK`
      });
      setUserBalance(coinBalance.totalBalance);
    } catch (e) {
      console.log("No balance found yet");
    }
  }

  useEffect(() => {
    if (isConnected) {
      fetchBalance();
      const interval = setInterval(fetchBalance, 5000);
      return () => clearInterval(interval);
    }
  }, [isConnected, currentAccount]);

  const fetchQueueData = async () => {
    if (LOCATION_OBJECTS.length === 0) return;
    
    setIsFetching(true);
    try {
      const objects = await client.multiGetObjects({
        ids: LOCATION_OBJECTS,
        options: { showContent: true }
      });

      const parsedLocations: QueueLocation[] = objects.map((obj: any) => {
        const fields = obj.data?.content?.fields;
    
        const lastUpdateDate = fields.last_update_ms > 0 
          ? new Date(parseInt(fields.last_update_ms)).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
          : "No data yet";

        let icon = "🏢";
        const nameLower = (fields.name || "").toLowerCase();
        const descLower = (fields.description || "").toLowerCase();
        
        if (nameLower.includes("hospital") || nameLower.includes("rs") || descLower.includes("hospital")) icon = "🏥";
        else if (nameLower.includes("bank") || descLower.includes("bank")) icon = "🏦";
        else if (nameLower.includes("immigration") || descLower.includes("immigration")) icon = "🛂";
        else if (nameLower.includes("airport") || descLower.includes("airport")) icon = "✈️";
        else if (nameLower.includes("city hall") || descLower.includes("government")) icon = "🏛️";
        else if (nameLower.includes("clinic") || descLower.includes("clinic")) icon = "⚕️";

        return {
          id: obj.data?.objectId,
          name: fields.name,
          type: fields.description, 
          currentQueue: parseInt(fields.current_queue),
          estimatedWait: parseInt(fields.estimated_wait),
          lastUpdate: lastUpdateDate,
          icon: icon,
          reporter: fields.reporter
        };
      });
      parsedLocations.sort((a, b) => a.name.localeCompare(b.name));
      setLocations(parsedLocations);

    } catch (error) {
      console.error("Failed to fetch blockchain data:", error);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchQueueData();
    const interval = setInterval(fetchQueueData, 5000); 
    return () => clearInterval(interval);
  }, []);


  const submitQueueUpdate = async () => {
    if (!queueNumber || !estimatedWait || !selectedLocation || !currentAccount) return
    setIsPending(true)
    
    try {
      const tx = new Transaction();

      // Include RewardPool 
      tx.moveCall({
        target: `${PACKAGE_ID}::${MODULE_NAME}::update_queue`,
        arguments: [
          tx.object(selectedLocation),
          tx.object(REWARD_POOL_ID), 
          tx.pure.u64(parseInt(queueNumber)),     
          tx.pure.u64(parseInt(estimatedWait)),   
          tx.object(CLOCK_OBJECT_ID)              
        ],
      });

      signAndExecuteTransaction(
        { transaction: tx },
        {
          onSuccess: (result) => {
            console.log("Transaction Successful:", result);
            setLastTxDigest(result.digest);
            
            const locationDetails = locations.find(l => l.id === selectedLocation);
            const newReport: LocalReport = {
              id: result.digest,
              locationName: locationDetails?.name || "Unknown Location",
              queueNumber: parseInt(queueNumber),
              estimatedWait: parseInt(estimatedWait),
              timestamp: new Date().toLocaleString(),
              txHash: result.digest
            };
            
            const updatedReports = [newReport, ...myReports];
            setMyReports(updatedReports);
            localStorage.setItem("queuecheck_history", JSON.stringify(updatedReports));

            setIsPending(false);
            setShowSuccess(true);
            fetchBalance(); 
            
            setQueueNumber("");
            setEstimatedWait("");
            setSelectedLocation(null);
            
            setTimeout(() => fetchQueueData(), 1000); 
            setTimeout(() => setShowSuccess(false), 4000);
          },
          onError: (error) => {
            console.error("Transaction Failed:", error);
            alert("Transaction Failed. Check console for details.");
            setIsPending(false);
          }
        }
      );
    } catch (e) {
      console.error(e);
      setIsPending(false);
    }
  }

  const getQueueColor = (queue: number) => {
    if (queue < 20) return COLORS.secondary 
    if (queue < 50) return "#d9a404" 
    return COLORS.primary
  }

  const getWaitColor = (wait: number) => {
    if (wait < 30) return COLORS.secondary
    if (wait < 60) return "#d9a404"
    return COLORS.primary
  }

  if (!isConnected) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        background: COLORS.bgGradient, position: "relative", overflow: "hidden", fontFamily: "'Segoe UI', sans-serif"
      }}>
        <div style={{ position: "absolute", top: "8%", left: "5%", width: "80px", height: "80px", borderRadius: "50%", background: COLORS.primary, opacity: 0.1 }} />
        <div style={{ position: "absolute", top: "20%", right: "8%", width: "50px", height: "50px", borderRadius: "50%", background: COLORS.secondary, opacity: 0.1 }} />
        
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", maxWidth: "800px", width: "100%", gap: "2rem" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "1rem" }}>
                <img src="/image/logo-qc.png" alt="QueueCheck Logo" style={{ height: "120px", objectFit: "contain" }} onError={(e) => e.currentTarget.style.display = 'none'} />
              </div>
              <h1 style={{ fontSize: "clamp(2.5rem, 8vw, 4rem)", fontWeight: "800", color: COLORS.primary, margin: 0, lineHeight: 1.1 }}>
                QueueCheck
              </h1>
              <p style={{ fontSize: "1.2rem", color: COLORS.textMain, margin: "1rem 0", fontWeight: "500" }}>
                Decentralized Public Queue Transparency
              </p>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", borderRadius: "20px", background: "white", marginTop: "0.5rem", border: `1px solid ${COLORS.secondary}33` }}>
                <span style={{ color: COLORS.secondary, fontSize: "0.8rem", fontWeight: "700", letterSpacing: "1px" }}>
                  ⛓️ POWERED BY IOTA TESTNET
                </span>
              </div>
            </div>

            <div style={{ padding: "2rem", borderRadius: "24px", textAlign: "center", background: "rgba(255,255,255,0.9)", backdropFilter: "blur(10px)", boxShadow: "0 8px 32px rgba(0,0,0,0.05)", border: `1px solid ${COLORS.primary}22`, width: "100%", maxWidth: "400px" }}>
                <p style={{ color: COLORS.textMain, fontWeight: "600", fontSize: "1.1rem", marginBottom: "1.5rem" }}>
                  Ready to check real-time queue?
                </p>
                <ConnectModal 
                  trigger={
                    <button
                      style={{ background: COLORS.primary, color: "white", padding: "1rem 2rem", borderRadius: "50px", border: "none", fontWeight: "700", fontSize: "1.1rem", cursor: "pointer", boxShadow: `0 4px 15px ${COLORS.primary}40`, width: "100%", transition: "transform 0.1s" }}
                    >
                      Connect Wallet
                    </button>
                  }
                />
            </div>
          </div>
        </div>
      </div>
    )
  }

  //  Dashboard 
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#FAFAFA", position: "relative", fontFamily: "'Segoe UI', sans-serif" }}>
      
      <div style={{ padding: "1rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 100, background: "white", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <img src="/image/logo-qc.png" alt="Logo" style={{ height: "40px", width: "auto" }} onError={(e) => e.currentTarget.style.display = 'none'} />
          <div>
            <h1 style={{ fontSize: "1.4rem", fontWeight: "800", color: COLORS.primary, margin: 0, lineHeight: 1 }}>QueueCheck</h1>
            <span style={{ color: COLORS.secondary, fontSize: "0.65rem", fontWeight: "700", letterSpacing: "0.5px" }}>ON IOTA NETWORK</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          {/* Coin balance */}
          <div style={{background: "#FFF8E1", color: COLORS.primary, padding: "0.6rem 1rem", borderRadius: "12px", border: `1px solid ${COLORS.accent}`, fontWeight: "700", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "5px"}}>
             💰 {userBalance} $QUEUE
          </div>

          <button onClick={() => setShowMyReports(true)} style={{ background: COLORS.accent, color: "#333", padding: "0.6rem 1.2rem", borderRadius: "12px", border: "none", fontWeight: "600", cursor: "pointer", fontSize: "0.9rem" }}>
            My Reports ({myReports.length})
          </button>
          <button onClick={() => disconnectWallet()} style={{ background: "transparent", color: COLORS.primary, padding: "0.6rem 1.2rem", borderRadius: "12px", border: `2px solid ${COLORS.primary}`, fontWeight: "700", cursor: "pointer", fontSize: "0.9rem" }}>
            {`Disconnect (${currentAccount?.address.slice(0, 4)}...${currentAccount?.address.slice(-4)})`}
          </button>
        </div>
      </div>

      <div style={{ flex: 1, padding: "2rem", position: "relative", zIndex: 1, overflowY: "auto" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", borderLeft: `5px solid ${COLORS.accent}`, paddingLeft: "1rem"}}>
             <h2 style={{ fontSize: "1.75rem", fontWeight: "800", color: COLORS.textMain, margin: 0 }}>
              Live Queue Status
            </h2>
            {isFetching && <span style={{fontSize: "0.8rem", color: "#888"}}>Updating data...</span>}
          </div>
          
          {/* If the location is empty */}
          {locations.length === 0 && (
            <div style={{textAlign: "center", padding: "3rem", color: "#888", background: "white", borderRadius: "20px", boxShadow: "0 4px 20px rgba(0,0,0,0.06)"}}>
               {isFetching ? (
                 <p>⏳ Loading data from Blockchain...</p>
               ) : (
  
                 <div>
                    <p style={{fontSize: "1.2rem", fontWeight: "bold", color: COLORS.primary}}>⚠️ No Locations Found</p>
                 </div>
               )}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem", marginBottom: "3rem" }}>
            {locations.map((location) => (
              <div
                key={location.id}
                style={{
                  background: "white", borderRadius: "20px", padding: "1.5rem", boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
                  border: selectedLocation === location.id ? `3px solid ${COLORS.primary}` : "3px solid transparent", cursor: "pointer", transition: "all 0.2s"
                }}
                onClick={() => setSelectedLocation(location.id)}
                onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-4px)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", marginBottom: "1.5rem" }}>
                  <div style={{ fontSize: "2.5rem", background: "#FFF8E1", width: "60px", height: "60px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "15px" }}>
                    {location.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: "0 0 0.25rem 0", color: COLORS.textMain, fontSize: "1.1rem", fontWeight: "700" }}>{location.name}</h3>
                    <p style={{ margin: 0, color: "#888", fontSize: "0.85rem", fontWeight: "500" }}>{location.type}</p>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "0.75rem", color: "#888", marginBottom: "0.25rem", textTransform: "uppercase" }}>Queue</div>
                    <div style={{ fontSize: "1.8rem", fontWeight: "800", color: getQueueColor(location.currentQueue) }}>{location.currentQueue}</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "0.75rem", color: "#888", marginBottom: "0.25rem", textTransform: "uppercase" }}>Est. Wait</div>
                    <div style={{ fontSize: "1.8rem", fontWeight: "800", color: getWaitColor(location.estimatedWait) }}>{location.estimatedWait}<span style={{fontSize: "1rem"}}>m</span></div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "1rem", borderTop: "1px solid #eee" }}>
                  <span style={{ fontSize: "0.75rem", color: "#999" }}>Updated: {location.lastUpdate}</span>
                  <span style={{ color: COLORS.primary, fontSize: "0.8rem", fontWeight: "600" }}>
                    {selectedLocation === location.id ? "Selected" : "Tap to Update"}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {selectedLocation && (
            <div style={{ background: "white", borderRadius: "24px", padding: "2.5rem", boxShadow: "0 10px 40px rgba(0,0,0,0.1)", maxWidth: "600px", margin: "0 auto", borderTop: `6px solid ${COLORS.primary}` }}>
              <h3 style={{ fontSize: "1.4rem", fontWeight: "800", color: COLORS.textMain, marginBottom: "1.5rem", textAlign: "center" }}>
                Update Queue Status
              </h3>
              <div style={{ background: "#FFF3E0", padding: "1rem", borderRadius: "12px", marginBottom: "2rem", textAlign: "center", border: `1px solid ${COLORS.primary}22` }}>
                <p style={{ margin: 0, color: COLORS.primary, fontWeight: "700" }}>
                  {locations.find(l => l.id === selectedLocation)?.icon} {locations.find(l => l.id === selectedLocation)?.name}
                </p>
                <p style={{fontSize: "0.7rem", color: "#888", margin: "0.5rem 0 0 0", wordBreak: "break-all"}}>{selectedLocation}</p>
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", color: COLORS.textMain, fontSize: "0.9rem" }}>Current Queue Number</label>
                <input type="number" min="0" value={queueNumber} onChange={(e) => setQueueNumber(e.target.value)} placeholder="e.g., 25" style={{ width: "100%", padding: "1rem", borderRadius: "12px", border: "2px solid #EEE", fontSize: "1.1rem", boxSizing: "border-box", color: "#333", backgroundColor: "#fff" }} />
              </div>

              <div style={{ marginBottom: "2rem" }}>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", color: COLORS.textMain, fontSize: "0.9rem" }}>Estimated Wait Time (minutes)</label>
                <input type="number" min="0" value={estimatedWait} onChange={(e) => setEstimatedWait(e.target.value)} placeholder="e.g., 45" style={{ width: "100%", padding: "1rem", borderRadius: "12px", border: "2px solid #EEE", fontSize: "1.1rem", boxSizing: "border-box", color: "#333", backgroundColor: "#fff" }} />
              </div>

              <div style={{ display: "flex", gap: "1rem" }}>
                <button onClick={() => { setSelectedLocation(null); setQueueNumber(""); setEstimatedWait(""); }} style={{ flex: 1, background: "#f0f0f0", color: "#666", padding: "1rem", borderRadius: "12px", border: "none", fontWeight: "600", cursor: "pointer" }}>Cancel</button>
                <button onClick={submitQueueUpdate} disabled={isPending || !queueNumber || !estimatedWait} style={{ flex: 2, background: isPending || !queueNumber || !estimatedWait ? "#ddd" : COLORS.secondary, color: "white", padding: "1rem", borderRadius: "12px", border: "none", fontWeight: "700", cursor: isPending || !queueNumber || !estimatedWait ? "not-allowed" : "pointer", boxShadow: isPending ? "none" : `0 4px 15px ${COLORS.secondary}40` }}>
                  {isPending ? "Signing..." : "Submit"}
                </button>
              </div>
            </div>
          )}

          {showSuccess && (
            <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", background: COLORS.secondary, color: "white", padding: "2rem 4rem", borderRadius: "20px", boxShadow: "0 20px 50px rgba(0,0,0,0.2)", zIndex: 1000, textAlign: "center" }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎉</div>
              <div style={{fontSize: "1.2rem", fontWeight: "700"}}>Update Submitted!</div>
              <div style={{fontSize: "1rem", marginTop: "0.5rem", background: "rgba(255,255,255,0.2)", padding: "0.2rem 1rem", borderRadius: "10px"}}>+1 $QUEUE Earned</div>
            </div>
          )}

          {showMyReports && (
            <div onClick={() => setShowMyReports(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0, 0, 0, 0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "2rem" }}>
              <div onClick={(e) => e.stopPropagation()} style={{ background: "white", borderRadius: "24px", maxWidth: "600px", width: "100%", maxHeight: "80vh", overflow: "auto", padding: "2rem", position: "relative", boxShadow: "0 20px 50px rgba(0,0,0,0.2)" }}>
                <button onClick={() => setShowMyReports(false)} style={{ position: "absolute", top: "1.5rem", right: "1.5rem", background: "#f0f0f0", color: "#333", border: "none", borderRadius: "50%", width: "36px", height: "36px", fontSize: "1.2rem", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                <h2 style={{ fontSize: "1.5rem", fontWeight: "800", color: COLORS.primary, marginBottom: "2rem", paddingBottom: "1rem", borderBottom: "2px solid #f0f0f0" }}> My Session Reports</h2>
                <p style={{fontSize: "0.9rem", color: "#666", marginBottom: "1rem"}}>Your report history for this session.</p>
                
                {myReports.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "3rem", color: "#999" }}>
                    <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📝</div>
                    <p>No reports yet. Start by reporting a queue status!</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {myReports.map((report) => (
                      <div key={report.id} style={{ background: "#FAFAFA", padding: "1.5rem", borderRadius: "16px", border: "1px solid #E0E0E0" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                          <h4 style={{ margin: 0, color: COLORS.textMain, fontSize: "1.1rem" }}>{report.locationName}</h4>
                          <span style={{ background: COLORS.secondary, color: "white", padding: "0.25rem 0.75rem", borderRadius: "20px", fontSize: "0.75rem", fontWeight: "600" }}>+1 QUEUE</span>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "0.5rem" }}>
                          <div style={{ background: "white", padding: "0.5rem", borderRadius: "8px", textAlign: "center", border: "1px solid #eee" }}>
                            <div style={{ color: "#888", fontSize: "0.75rem" }}>Queue</div>
                            <div style={{ fontWeight: "700", color: COLORS.textMain, fontSize: "1.1rem" }}>{report.queueNumber}</div>
                          </div>
                          <div style={{ background: "white", padding: "0.5rem", borderRadius: "8px", textAlign: "center", border: "1px solid #eee" }}>
                            <div style={{ color: "#888", fontSize: "0.75rem" }}>Wait</div>
                            <div style={{ fontWeight: "700", color: COLORS.textMain, fontSize: "1.1rem" }}>{report.estimatedWait}m</div>
                          </div>
                        </div>
                        <div style={{ fontSize: "0.7rem", color: "#888", marginTop: "0.5rem", wordBreak: "break-all" }}>
                          <strong>Tx:</strong> {report.txHash}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

export default QueueCheck