export type DaumPostcodeData = {
  zonecode?: string
  postcode?: string
  address?: string
  roadAddress?: string
  jibunAddress?: string
  userSelectedType?: 'R' | 'J'
  bname?: string
  buildingName?: string
  x?: string | number
  y?: string | number
}

export type DaumPostcodeConstructor = new (options: {
  oncomplete: (data: DaumPostcodeData) => void
  onclose?: (state: string) => void
  width?: string | number
  height?: string | number
}) => {
  open: (options?: { popupKey?: string; q?: string }) => void
  embed: (element: HTMLElement, options?: { q?: string; autoClose?: boolean }) => void
}

declare global {
  interface Window {
    daum: {
      Postcode: DaumPostcodeConstructor
    }
  }
}

export {}
