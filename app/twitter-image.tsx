import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'AI 할 일 관리 서비스'
export const size = {
    width: 1200,
    height: 630,
}

export const contentType = 'image/png'

export default async function Image() {
    return new ImageResponse(
        (
            <div
                style={{
                    height: '100%',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#2563EB',
                    backgroundImage: 'linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '30px',
                    }}
                >
                    <div
                        style={{
                            fontSize: 60,
                            color: 'white',
                            marginRight: '15px',
                        }}
                    >
                        ✓
                    </div>
                    <div
                        style={{
                            fontSize: 45,
                            color: 'white',
                            fontWeight: 'bold',
                        }}
                    >
                        AI 할 일 관리
                    </div>
                </div>
                <div
                    style={{
                        fontSize: 24,
                        color: 'rgba(255, 255, 255, 0.9)',
                        textAlign: 'center',
                    }}
                >
                    똑똑한 AI가 도와주는 할 일 관리
                </div>
            </div>
        ),
        {
            ...size,
        }
    )
}
