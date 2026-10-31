import type { PhotoDto } from '@/features/meals/mealApi'

export function filesToPhotoDtos(files: File[]): Promise<PhotoDto[]> {
  return Promise.all(
    files.map(file => new Promise<PhotoDto>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const [meta, data] = (reader.result as string).split(',')
        resolve({ data, mediaType: meta.replace('data:', '').replace(';base64', '') })
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })),
  )
}
