import { useRef, useState, type ChangeEvent } from 'react'
import { Camera, Image } from 'lucide-react'
import Button from '@/components/Button'
import type { PhotoDto } from '@/features/meals/mealApi'
import { filesToPhotoDtos } from '@/lib/photos'

interface PhotoPickerProps {
  onChange: (photos: PhotoDto[]) => void
  disabled?: boolean
}

/** Kamera und Galerie bleiben getrennt: iOS blockiert die Kamera, sobald `multiple` gesetzt ist. */
export default function PhotoPicker({ onChange, disabled }: PhotoPickerProps) {
  const [count, setCount] = useState(0)
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  async function handleFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length) return
    onChange(await filesToPhotoDtos(files))
    setCount(files.length)
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFiles} />
      <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
      <Button variant="secondary" disabled={disabled} onClick={() => cameraRef.current?.click()}>
        <Camera size={18} aria-hidden /> Kamera
      </Button>
      <Button variant="secondary" disabled={disabled} onClick={() => galleryRef.current?.click()}>
        <Image size={18} aria-hidden /> {count > 0 ? `${count} Foto${count > 1 ? 's' : ''}` : 'Galerie'}
      </Button>
    </div>
  )
}
