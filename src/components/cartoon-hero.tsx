import { useChat } from "@ai-sdk/react"
import { SignInButton, useAuth, useUser } from "@clerk/clerk-react"
import { useAction, useMutation, useQuery } from "convex/react"
import { Download, ImageIcon, Sparkles, Upload } from "lucide-react"
import React, { useEffect, useRef, useState } from "react"
import { api } from "../../convex/_generated/api"
import { Credits } from "./credits"
import { Button } from "./ui/button"

export default function CartoonHero() {
  const [image, setImage] = useState<string | null>(null)
  const [cartoonImage, setCartoonImage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [imageId, setImageId] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const getPlansAction = useAction(api.transactions.getPlansPolar);
  const [plans, setPlans] = useState<any>(null);


  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const plansData = await getPlansAction();
        setPlans(plansData);
      } catch (error) {
        console.error("Error fetching plans:", error);
      }
    };
    fetchPlans();
  }, [getPlansAction]);

  const { messages, handleInputChange, handleSubmit } = useChat({
    api: "https://blessed-kudu-154.convex.site/api/chat",
    body: image ? { image } : undefined
  })

  console.log('messages', messages)

  const { isSignedIn, userId } = useAuth()
  const { user } = useUser()

  // Convex mutations and queries
  const generateUploadUrl = useMutation(api.files.generateUploadUrl)
  const saveUploadedImage = useMutation(api.files.saveUploadedImage)
  const cartoonifyImage = useMutation(api.files.cartoonifyImage)
  const storeUser = useMutation(api.files.storeUser)

  // Get image details from the database
  const imageDetails = useQuery(
    api.files.getImageByStorageId,
    imageId ? { storageId: imageId } : "skip"
  )

  // Store user in Convex when they sign in
  useEffect(() => {
    const saveUser = async () => {
      if (isSignedIn && user) {
        await storeUser({
          name: user.fullName || user.username || "Anonymous",
          email: user.primaryEmailAddress?.emailAddress || "",
          clerkId: userId || "",
        })
      }
    }

    if (isSignedIn && user) {
      saveUser()
    }
  }, [isSignedIn, user, userId, storeUser])

  // Update cartoonImage when imageDetails changes
  useEffect(() => {
    if (imageDetails?.status === "completed" && imageDetails?.cartoonImageUrl) {
      setCartoonImage(imageDetails.cartoonImageUrl)
    }
  }, [imageDetails])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !isSignedIn) return

    setIsProcessing(true)
    setUploadError(null)

    try {
      // Display the image preview locally
      const reader = new FileReader()
      reader.onload = async (event) => {
        const imageData = event.target?.result as string
        setImage(imageData)
        setCartoonImage(null)

        // Set the instruction message and submit to the AI chat
        handleInputChange({
          target: { value: 'Convert this image to a cartoon image' }
        } as React.ChangeEvent<HTMLInputElement>)

        // Submit the image and message to the AI chat
        setTimeout(() => {
          handleSubmit(new Event('submit') as any)
        }, 100)
      }
      reader.readAsDataURL(file)

      // Upload to Convex
      const uploadUrl = await generateUploadUrl()

      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      })

      if (!result.ok) {
        throw new Error(`Upload failed: ${result.statusText}`)
      }

      const { storageId } = await result.json()

      // Save image metadata
      if (userId) {
        await saveUploadedImage({
          storageId,
          userId,
        })

        setImageId(storageId)
      }
    } catch (error) {
      console.error("Error uploading image:", error)
      setUploadError("Failed to upload image. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCartoonify = async () => {
    if (!image || !imageId || !isSignedIn) return
    setIsProcessing(true)
    setUploadError(null)

    try {
      // Process image through Convex
      await cartoonifyImage({ storageId: imageId })

      // After processing, the imageDetails query will automatically refresh
      // and we can get the cartoon image URL from there
      if (imageDetails?.cartoonImageUrl) {
        setCartoonImage(imageDetails.cartoonImageUrl)
      } else if (imageDetails?.originalImageUrl) {
        // Fallback to original image if cartoon isn't available
        setCartoonImage(imageDetails.originalImageUrl)
      }
    } catch (error) {
      console.error("Error cartoonifying image:", error)
      setUploadError("Failed to cartoonify image. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <main className="w-full py-12 px-4">
        {/* Hero Section */}
        <div className="mx-auto max-w-2xl text-center mb-14">
          <div className="inline-flex items-center gap-2 rounded-[20px] bg-[#0066CC]/10 px-4 py-2 mb-6">
            <span className="text-sm font-medium text-[#0066CC]">
              Transform your photos instantly
            </span>
          </div>
          <h1 className="text-3xl font-semibold md:text-5xl tracking-tight text-[#1D1D1F]">
            Transform your photos into cartoons
          </h1>
          <p className="mt-6 text-base text-[#86868B] max-w-lg mx-auto leading-relaxed">
            Minimal, clean, black & white cartoon transformations with our AI technology.
          </p>
        </div>

        {/* Image Transformation Section */}
        <div className="mx-auto max-w-3xl">
          <div className="relative rounded-xl shadow-sm border border-neutral-100 overflow-hidden">
            
            {/* Image transformation studio */}
            <div className="relative z-10 py-6">
              {/* Image headers */}
              <div className="flex justify-between mb-2 px-4">
                <div className="flex items-center pl-5">
                  <div className="w-2 h-2 rounded-full bg-[#0066CC] mr-2"></div>
                  <span className="text-sm font-medium text-[#1D1D1F]">Original Photo</span>
                </div>
                <div className="flex items-center pr-5">
                  <span className="text-sm font-medium text-[#1D1D1F]">Cartoon Version</span>
                  <div className="w-2 h-2 rounded-full bg-[#0066CC] ml-2"></div>
                </div>
              </div>
              
              {/* Main content area */}
              <div className="flex items-center justify-center">
                {/* Left side - Original image */}
                <div className="w-[42%]">
                  <div className="aspect-square overflow-hidden rounded-xl relative border border-neutral-100 bg-white">
                    {image ? (
                      <img src={image} alt="Original" className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center p-4">
                        <div className="bg-blue-50 p-3 rounded-full mb-2">
                          <ImageIcon className="h-6 w-6 text-[#0066CC]" />
                        </div>
                        <p className="text-xs text-[#86868B] font-medium">Upload your photo</p>
                        <p className="text-xs text-[#86868B] mt-1 max-w-[150px] text-center opacity-80">Use a clear portrait photo</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Middle - Transformation arrow */}
                <div className="flex items-center justify-center mx-2">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#0066CC] text-white">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>

                {/* Right side - Cartoon result */}
                <div className="w-[42%]">
                  <div className="aspect-square overflow-hidden rounded-xl relative border border-neutral-100 bg-white">
                    {cartoonImage ? (
                      <img
                        src={cartoonImage}
                        alt="Cartoon"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center p-4">
                        <div className="bg-blue-50 p-3 rounded-full mb-2">
                          <Sparkles className="h-6 w-6 text-[#0066CC]" />
                        </div>
                        <p className="text-xs text-[#86868B] font-medium">Cartoon result</p>
                        <p className="text-xs text-[#86868B] mt-1 max-w-[150px] text-center opacity-80">Result will appear here</p>
                        {uploadError && (
                          <p className="mt-2 text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded-full">{uploadError}</p>
                        )}
                      </div>
                    )}

                    {isProcessing && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-xl">
                        <div className="flex flex-col items-center">
                          <div className="h-8 w-8 border-2 border-t-[#0066CC] border-r-[#0066CC]/20 border-b-[#0066CC]/20 border-l-[#0066CC]/20 rounded-full animate-spin"></div>
                          <p className="text-xs mt-2 font-medium text-[#1D1D1F] bg-white px-3 py-0.5 rounded-full">Processing...</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Action buttons row */}
              <div className="mt-4 flex justify-center">
                <div className="flex gap-2 w-full max-w-md">
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 h-10 text-xs font-medium rounded-lg bg-[#0066CC] hover:bg-[#0077ED] text-white shadow-sm transition-all"
                    disabled={!isSignedIn || isProcessing}
                  >
                    <Upload className="mr-1.5 h-4 w-4" /> Upload
                  </Button>

                  <Button
                    onClick={handleCartoonify}
                    disabled={!isSignedIn || !image || isProcessing}
                    className="flex-1 h-10 text-xs font-medium rounded-lg bg-[#8BB4F7] hover:bg-[#7CAAFC] text-white shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Sparkles className="mr-1.5 h-4 w-4" /> Transform
                  </Button>

                  {cartoonImage && (
                    <Button
                      variant="outline"
                      className="flex-1 h-10 text-xs font-medium rounded-lg border-[#0066CC]/30 hover:bg-[#0066CC]/5 text-[#0066CC] hover:text-[#0066CC] shadow-sm transition-all"
                      onClick={() => window.open(cartoonImage, "_blank")}
                    >
                      <Download className="mr-1.5 h-4 w-4" /> Download
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {!isSignedIn && (
            <div className="mt-8 text-center bg-white rounded-2xl p-6 shadow-sm max-w-md mx-auto border border-neutral-100">
              <div className="mb-3 mx-auto w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z" stroke="#0066CC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 14C8.13401 14 5 17.134 5 21H19C19 17.134 15.866 14 12 14Z" stroke="#0066CC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className="text-xl font-medium text-[#1D1D1F] mb-2">Sign in to continue</h3>
              <p className="text-sm text-[#86868B] mb-4">Create an account to access all premium features</p>
              <SignInButton mode="modal" fallbackRedirectUrl="/">
                <Button
                  className="h-12 px-6 text-sm font-medium rounded-xl bg-[#0066CC] hover:bg-[#0077ED] text-white shadow-sm transition-all hover:shadow-md w-full"
                >
                  Sign In
                </Button>
              </SignInButton>
            </div>
          )}
        </div>
        {/* Pricing Section */}
        <div className="text-center mx-auto max-w-2xl mb-12 mt-16">
          <div className="inline-flex items-center gap-2 rounded-[20px] bg-[#0066CC]/10 px-4 py-2 mb-6">
            <span className="text-sm font-medium text-[#0066CC]">
              Choose Your Plan
            </span>
          </div>
          <h2 className="text-3xl font-semibold tracking-tight text-[#1D1D1F]">
            Simple, Transparent Pricing
          </h2>
          <p className="mt-4 text-base text-[#86868B] max-w-lg mx-auto leading-relaxed">
            Get unlimited access to our AI cartoon transformation technology with our flexible pricing options.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans?.items?.map((product: any) => (
            product.prices.map((price: any) => (
              <Credits
                key={price.id}
                price={price}
              />
            ))
          ))}
        </div>
      </main>
    </div>
  )
}

