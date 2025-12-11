import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'

export default async function Home() {
    const c = await cookies()
    const token = c.get('token')?.value ?? null

    if (!token) {
        redirect('/login')
    }

    let payload: any = null
    try {
        payload = jwt.verify(token, JWT_SECRET) as Record<string, any>
    } catch (e) {
        // invalid token -> go to login
        redirect('/login')
    }

    const userLabel = payload?.email ?? 'користувач'

    return (
        <div>
            <h1>Вітаємо, {userLabel}!</h1>
            <p>
                Це внутрішня система управління для сімейного розважального
                центру — тут ви можете керувати документацією, бухгалтерією,
                користувачами та іншими ресурсами центру.
            </p>
            <p>
                Використовуйте меню зверху, щоб перейти до документації,
                бухгалтерії або адміністративної панелі (якщо у вас є права
                адміністратора).
            </p>
        </div>
    )
}
