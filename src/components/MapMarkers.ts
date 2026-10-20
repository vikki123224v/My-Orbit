import L from 'leaflet'

// Helper to construct custom HTML pin markers matching the reference design
export function createUserMarkerIcon(avatarUrl: string | null, name: string, isSelf: boolean = false) {
  const initial = (name || 'U')[0].toUpperCase()
  const borderColor = isSelf ? '#06b6d4' : '#8b5cf6'
  const glowColor = isSelf ? 'rgba(6, 182, 212, 0.4)' : 'rgba(139, 92, 246, 0.4)'

  const innerAvatar = avatarUrl
    ? `<img src="${avatarUrl}" alt="${name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 9999px;" />`
    : `<div style="width: 100%; height: 100%; background: #1e1b4b; color: #c4b5fd; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; border-radius: 9999px;">${initial}</div>`

  const html = `
    <div style="position: relative; width: 48px; height: 56px; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
      <div style="
        width: 44px;
        height: 44px;
        border-radius: 9999px;
        padding: 2.5px;
        background: linear-gradient(135deg, ${borderColor}, #4f46e5);
        box-shadow: 0 0 15px ${glowColor}, 0 4px 6px -1px rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="width: 100%; height: 100%; border-radius: 9999px; overflow: hidden; background: #090d16;">
          ${innerAvatar}
        </div>
      </div>
      <!-- Pin Pointer Triangle -->
      <div style="
        width: 0;
        height: 0;
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
        border-top: 8px solid ${borderColor};
        margin-top: -2px;
      "></div>
      ${
        isSelf
          ? `<span style="
              position: absolute;
              bottom: -16px;
              background: rgba(6, 182, 212, 0.9);
              color: #ffffff;
              font-size: 10px;
              font-weight: 700;
              padding: 1px 6px;
              border-radius: 9999px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            ">Me</span>`
          : ''
      }
    </div>
  `

  return L.divIcon({
    html,
    className: 'custom-leaflet-marker',
    iconSize: [48, 56],
    iconAnchor: [24, 52],
    popupAnchor: [0, -48],
  })
}

export function createMorphedMarkerIcon() {
  const html = `
    <div style="position: relative; width: 46px; height: 54px; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
      <div style="
        width: 42px;
        height: 42px;
        border-radius: 9999px;
        background: radial-gradient(circle, #7c3aed 0%, #312e81 100%);
        border: 2px solid #a855f7;
        box-shadow: 0 0 20px rgba(168, 85, 247, 0.6), inset 0 0 10px rgba(255, 255, 255, 0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        font-weight: 800;
        font-size: 18px;
        animation: pulse 2s infinite;
      ">
        ?
      </div>
      <div style="
        width: 0;
        height: 0;
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
        border-top: 8px solid #a855f7;
        margin-top: -2px;
      "></div>
    </div>
  `

  return L.divIcon({
    html,
    className: 'custom-morphed-marker',
    iconSize: [46, 54],
    iconAnchor: [23, 50],
    popupAnchor: [0, -46],
  })
}
