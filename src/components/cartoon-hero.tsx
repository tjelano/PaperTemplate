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
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-8 sm:grid-cols-2">
            {/* Original Image Card */}
            <div className="group border relative rounded-[32px] bg-white p-8 transition-all hover:scale-[1.01] hover:shadow-lg">
              {/* Background gradient effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-white to-neutral-50 rounded-[32px] -z-10" />
              
              <h3 className="text-xl font-semibold text-[#1D1D1F] mb-4">
                Original Photo
              </h3>
              
              <div className="aspect-square overflow-hidden rounded-[24px] relative mb-4 border border-neutral-100">
                {image ? (
                  <img src={image} alt="Original" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center p-4 bg-neutral-50">
                    <ImageIcon className="h-10 w-10 text-[#86868B] mb-2" />
                    <p className="text-base text-[#86868B] font-medium">Upload your photo</p>
                  </div>
                )}
              </div>
              
              <div className="mt-4">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-12 text-base rounded-[14px] bg-[#0066CC] hover:bg-[#0077ED] text-white shadow-sm transition-all"
                  disabled={!isSignedIn || isProcessing}
                >
                  <Upload className="mr-2 h-5 w-5" /> Upload Photo
                </Button>
              </div>
            </div>

            {/* Cartoon Image Card */}
            <div className="group border relative rounded-[32px] bg-white p-8 transition-all hover:scale-[1.01] hover:shadow-lg">
              {/* Background gradient effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-white to-neutral-50 rounded-[32px] -z-10" />
              
              <h3 className="text-xl font-semibold text-[#1D1D1F] mb-4">
                Cartoon Version
              </h3>
              
              <div className="aspect-square overflow-hidden rounded-[24px] relative mb-4 border border-neutral-100">
                {cartoonImage ? (
                  <img
                    src={cartoonImage}
                    alt="Cartoon"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center p-4 bg-neutral-50">
                    <Sparkles className="h-10 w-10 text-[#86868B] mb-2" />
                    <p className="text-base text-[#86868B] font-medium">Cartoon result</p>
                    {uploadError && (
                      <p className="mt-2 text-sm text-red-500">{uploadError}</p>
                    )}
                  </div>
                )}

                {isProcessing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/90 rounded-[24px]">
                    <div className="flex flex-col items-center">
                      <div className="h-10 w-10 border-2 border-t-[#0066CC] border-r-[#0066CC]/20 border-b-[#0066CC]/20 border-l-[#0066CC]/20 rounded-full animate-spin"></div>
                      <p className="text-sm mt-3 font-medium text-[#1D1D1F]">Processing...</p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-4 space-y-3">
                <Button
                  onClick={handleCartoonify}
                  disabled={!isSignedIn || !image || isProcessing}
                  className="w-full h-12 text-base rounded-[14px] bg-[#0066CC] hover:bg-[#0077ED] text-white shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkles className="mr-2 h-5 w-5" /> Cartoonify
                </Button>

                {cartoonImage && (
                  <Button
                    variant="outline"
                    className="w-full h-12 text-base rounded-[14px] border-[#0066CC]/30 hover:bg-[#0066CC]/5 text-[#0066CC] hover:text-[#0066CC] shadow-sm transition-all"
                    onClick={() => window.open(cartoonImage, "_blank")}
                  >
                    <Download className="mr-2 h-5 w-5" /> Download
                  </Button>
                )}
              </div>
            </div>
          </div>

          {!isSignedIn && (
            <div className="mt-8 text-center">
              <SignInButton mode="modal" fallbackRedirectUrl="/">
                <Button
                  className="h-12 px-6 text-base rounded-[14px] bg-[#0066CC] hover:bg-[#0077ED] text-white shadow-sm transition-all"
                >
                  Sign In to Continue
                </Button>
              </SignInButton>
              <p className="mt-4 text-sm text-[#86868B]">Sign in to access all features</p>
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

