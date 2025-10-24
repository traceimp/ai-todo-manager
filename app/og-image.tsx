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
                    backgroundImage: 'linear-gradient(45deg, #2563EB 0%, #06B6D4 100%)',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '40px',
                    }}
                >
                    <div
                        style={{
                            fontSize: 80,
                            color: 'white',
                            marginRight: '20px',
                        }}
                    >
                        ✓
                    </div>
                    <div
                        style={{
                            fontSize: 60,
                            color: 'white',
                            fontWeight: 'bold',
                        }}
                    >
                        AI 할 일 관리 서비스
                    </div>
                </div>
                <div
                    style={{
                        fontSize: 30,
                        color: 'rgba(255, 255, 255, 0.9)',
                        textAlign: 'center',
                    }}
                >
                    AI가 도와주는 똑똑한 할 일 관리 서비스
                </div>
            </div>
        ),
        {
            ...size,
        }
    )
}
