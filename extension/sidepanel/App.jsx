import React, { useState, useEffect } from 'react'
import {
    ArrowDownToLine,
    Check,
    ChevronRight,
    CircleHelp,
    CloudUpload,
    Eye,
    Heart,
    Info,
    Layers3,
    Link2,
    Lock,
    MoreHorizontal,
    PackageOpen,
    Plus,
    RotateCcw,
    Sparkles,
    Trash2,
    UserRound,
    WandSparkles,
    Wifi,
    X,
    Loader2
} from 'lucide-react'

const BACKEND_URL = 'http://localhost:3000'

const initialProducts = [
    { id: 1, name: 'Relaxed Linen Shirt', category: 'T-Shirt', price: '$89.00', tone: 'sand', imageUrl: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=300' },
    { id: 2, name: 'Silk Slip Dress', category: 'Dress', price: '$148.00', tone: 'rose', imageUrl: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=300' },
    { id: 3, name: 'Suede Loafers', category: 'Shoes', price: '$210.00', tone: 'cocoa', imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=300' },
    { id: 4, name: 'Classic Hoop Earrings', category: 'Jewelry', price: '$36.00', tone: 'gold', imageUrl: 'https://images.unsplash.com/photo-1630019852942-f89202989a59?w=300' },
]

const profileSlots = [
    { label: 'Full Body', key: '01', tone: 'full', uploaded: true },
    { label: 'Upper Body', key: '02', tone: 'upper', uploaded: true },
    { label: 'Lower Body', key: '03', tone: 'lower', uploaded: false },
    { label: 'Shoes / Feet', key: '04', tone: 'feet', uploaded: false },
    { label: 'Face', key: '05', tone: 'face', uploaded: true },
]

function Logo() {
    return (
        <div className="flex items-center gap-2.5">
            <div className="logo-mark"><Sparkles /></div>
            <span className="text-[15px] font-semibold tracking-[-0.02em]">TryOn <span className="text-accent">AI</span></span>
        </div>
    )
}

function ProductArt({ imageUrl, tone }) {
    return (
        <div className={`product-art product-art-${tone} overflow-hidden rounded-lg bg-secondary/30`}>
            <img src={imageUrl || "/tryon-fashion.png"} alt="Product" className="h-full w-full object-cover" />
        </div>
    )
}

function DetectedProducts({ products, selected, setSelected, onGenerate, domain, isLoading }) {
    const toggleSelect = (index) => {
        if (selected.includes(index)) {
            setSelected(selected.filter((item) => item !== index))
        } else {
            setSelected([...selected, index])
        }
    }

    return (
        <section className="flex flex-1 flex-col gap-4 px-4 pb-4 pt-5">
            <div className="flex items-start justify-between">
                <div>
                    <p className="eyebrow">CURRENT PAGE</p>
                    <h1 className="mt-1 text-[19px] font-semibold tracking-[-0.03em]">{products.length} items detected</h1>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><Link2 /> {domain}</p>
                </div>
                <button className="icon-button" aria-label="More options"><MoreHorizontal /></button>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border/70 bg-secondary/40 px-3 py-2.5 text-xs">
                <span className="flex items-center gap-2 text-muted-foreground"><Eye /> Select pieces to try on</span>
                <span className="font-medium text-foreground">{selected.length}/{products.length} selected</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
                {products.map((product, index) => {
                    const isSelected = selected.includes(index)
                    return (
                        <button key={product.id || index} onClick={() => toggleSelect(index)} className={`product-card text-left ${isSelected ? 'product-card-selected' : ''}`} aria-pressed={isSelected}>
                            <div className="relative">
                                <ProductArt imageUrl={product.imageUrl} tone={product.tone || 'sand'} />
                                <span className="select-dot">{isSelected && <Check />}</span>
                                <span className="angle-pill">2 angles <ChevronRight /></span>
                            </div>
                            <div className="p-2.5">
                                <p className="truncate text-[12px] font-medium">{product.name}</p>
                                <div className="mt-1.5 flex items-center justify-between">
                                    <span className="tag">{product.category}</span>
                                    <span className="text-[11px] font-semibold">{product.price}</span>
                                </div>
                            </div>
                        </button>
                    )
                })}
            </div>
            <div className="mt-auto rounded-xl border border-accent/20 bg-accent/5 p-3">
                <div className="flex gap-2.5">
                    <WandSparkles className="mt-0.5 text-accent" />
                    <div>
                        <p className="text-xs font-semibold">Make it yours</p>
                        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Choose your profile photo, then see how these pieces fit your style.</p>
                    </div>
                </div>
            </div>
            <button className="primary-button flex items-center justify-center gap-2" onClick={onGenerate} disabled={isLoading || selected.length === 0}>
                {isLoading ? <Loader2 className="animate-spin" /> : <WandSparkles />}
                {isLoading ? 'Generating AI Try-On...' : 'Generate Try-On'}
            </button>
        </section>
    )
}

function DigitalProfile() {
    return (
        <section className="flex flex-1 flex-col gap-4 px-4 pb-4 pt-5">
            <div>
                <p className="eyebrow">YOUR DIGITAL PROFILE</p>
                <h1 className="mt-1 text-[19px] font-semibold tracking-[-0.03em]">Photos for better fits</h1>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Add clear photos to help TryOn AI understand your shape and style.</p>
            </div>
            <div className="profile-grid">
                {profileSlots.map((slot) => (
                    <div key={slot.label} className="profile-slot">
                        <div className={`profile-art profile-art-${slot.tone}`}>
                            {slot.uploaded ? <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200" alt={`${slot.label} profile`} className="h-full w-full object-cover" /> : <CloudUpload />}
                            {slot.uploaded && <span className="status-dot"><Check /></span>}
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                            <span className="text-[11px] font-medium">{slot.label}</span>
                            {slot.uploaded ? <span className="status-text">Uploaded</span> : <span className="missing-text">Missing</span>}
                        </div>
                    </div>
                ))}
            </div>
            <div className="info-box">
                <Info />
                <div>
                    <p className="text-xs font-semibold">Photo guidelines</p>
                    <ul className="mt-1.5 flex flex-col gap-1 text-[11px] leading-relaxed text-muted-foreground">
                        <li>• Use natural, even lighting</li>
                        <li>• Stand straight against a plain background</li>
                        <li>• Keep your full body in frame</li>
                    </ul>
                </div>
                <CircleHelp className="ml-auto shrink-0 text-muted-foreground" />
            </div>
            <button className="secondary-button"><Plus /> Upload missing photos</button>
            <div className="mt-auto flex flex-col gap-2">
                <button className="primary-button"><Check /> Update Profile</button>
                <button className="danger-button"><Trash2 /> Delete Profile Data</button>
            </div>
        </section>
    )
}

function Results({ resultImage, selectedProduct }) {
    return (
        <section className="flex flex-1 flex-col gap-4 px-4 pb-4 pt-5">
            <div className="flex items-start justify-between">
                <div>
                    <p className="eyebrow">TRY-ON COMPLETE</p>
                    <h1 className="mt-1 text-[19px] font-semibold tracking-[-0.03em]">Your look is ready</h1>
                    <p className="mt-1 text-xs text-muted-foreground">{selectedProduct?.name || 'Relaxed Linen Shirt'}</p>
                </div>
                <span className="done-badge"><Check /> Ready</span>
            </div>
            <div className="result-frame overflow-hidden rounded-xl bg-secondary/30 relative">
                <img src={resultImage || "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600"} alt="Generated try-on result" className="w-full h-64 object-cover" />
                <div className="result-glow" />
                <div className="compare-label left">PROFILE + PRODUCT</div>
                <div className="compare-label right">VISUALIZED RESULT</div>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border/70 bg-secondary/40 px-3 py-2">
                <span className="flex items-center gap-2 text-[11px] text-muted-foreground"><Layers3 /> Compare view</span>
                <button className="toggle-switch" aria-label="Toggle comparison"><span /></button>
            </div>
            <div className="mt-auto grid grid-cols-3 gap-2">
                <button className="action-button"><Heart />Save</button>
                <button className="action-button"><ArrowDownToLine />Download</button>
                <button className="action-button"><RotateCcw />Try another</button>
            </div>
        </section>
    )
}

export default function App() {
    const [tab, setTab] = useState('products')
    const [products, setProducts] = useState(initialProducts)
    const [selectedIndices, setSelectedIndices] = useState([0])
    const [domain, setDomain] = useState('shop.madewell.com')
    const [isLoading, setIsLoading] = useState(false)
    const [resultImage, setResultImage] = useState(null)

    useEffect(() => {
        if (typeof chrome !== 'undefined' && chrome.tabs) {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]?.url) {
                    try {
                        const urlObj = new URL(tabs[0].url)
                        setDomain(urlObj.hostname)
                    } catch (e) {
                        console.error('URL parse error', e)
                    }
                }
            })

            const handleMessage = (message) => {
                if (message.type === 'PRODUCTS_DETECTED' && message.products) {
                    setProducts(message.products)
                }
            }

            chrome.runtime.onMessage.addListener(handleMessage)
            return () => chrome.runtime.onMessage.removeListener(handleMessage)
        }
    }, [])

    const handleGenerateTryOn = async () => {
        setIsLoading(true)
        const selectedItem = products[selectedIndices[0]] || products[0]

        try {
            const response = await fetch(`${BACKEND_URL}/api/tryon`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productImage: selectedItem.imageUrl,
                    productName: selectedItem.name,
                    category: selectedItem.category
                })
            })

            if (response.ok) {
                const data = await response.json()
                setResultImage(data.resultImageUrl || data.imageUrl)
            }
        } catch (error) {
            console.warn('Backend request failed, defaulting to client preview:', error)
        } finally {
            setIsLoading(false)
            setTab('results')
        }
    }

    return (
        <main className="extension-shell">
            <header className="extension-header">
                <Logo />
                <div className="flex items-center gap-2">
                    <span className="connection"><Wifi /> Connected</span>
                    <button className="icon-button" aria-label="Close panel"><X /></button>
                </div>
            </header>
            <div className="privacy-row"><Lock /> Your photos stay private and are never shared.</div>
            <nav className="tab-bar" aria-label="TryOn AI sections">
                {[
                    ['products', 'Products', PackageOpen],
                    ['profile', 'Profile', UserRound],
                    ['results', 'Results', Sparkles]
                ].map(([key, label, Icon]) => (
                    <button key={key} onClick={() => setTab(key)} className={`tab-button ${tab === key ? 'tab-button-active' : ''}`}>
                        <Icon />
                        {label}
                        {key === 'results' && <span className="tab-count">1</span>}
                    </button>
                ))}
            </nav>

            {tab === 'products' && (
                <DetectedProducts
                    products={products}
                    selected={selectedIndices}
                    setSelected={setSelectedIndices}
                    onGenerate={handleGenerateTryOn}
                    domain={domain}
                    isLoading={isLoading}
                />
            )}
            {tab === 'profile' && <DigitalProfile />}
            {tab === 'results' && <Results resultImage={resultImage} selectedProduct={products[selectedIndices[0]]} />}

            <footer className="extension-footer">
                <span>TryOn AI v1.4.2</span>
                <span className="flex items-center gap-1"><Lock /> Private by design</span>
            </footer>
        </main>
    )
}