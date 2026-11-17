import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No image file uploaded' }, { status: 400 })
    }

    // Verify it is an image
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files (JPEG, PNG, WebP) are allowed' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'offers')
    await mkdir(uploadDir, { recursive: true })

    const ext = path.extname(file.name) || '.jpg'
    const fileName = `offer_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${ext}`
    const filePath = path.join(uploadDir, fileName)

    await writeFile(filePath, buffer)

    return NextResponse.json({
      success: true,
      url: `/uploads/offers/${fileName}`,
      filename: fileName,
      size: buffer.length,
    })
  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
