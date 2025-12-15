import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import jwt from 'jsonwebtoken'
import Link from 'next/link'
import styles from './page.module.css'

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
        redirect('/login')
    }

    const userLabel = payload?.email ?? 'користувач'

    const modules = [
        { href: '/cash-register', icon: '💰', title: 'Каса', description: 'Продажі, чеки, звіти' },
        { href: '/accounting', icon: '📊', title: 'Бухгалтерія', description: 'Фінанси, транзакції, аналітика' },
        { href: '/staff', icon: '👥', title: 'Персонал', description: 'Співробітники, графіки, зарплати' },
        { href: '/projects', icon: '📁', title: 'Проекти', description: 'Управління проектами' },
        { href: '/docs', icon: '📄', title: 'Документи', description: 'Документація та файли' },
    ]

    return (
        <div className={styles.page}>
            <main className={styles.main}>
                <div className={styles.hero}>
                    <h1 className={styles.title}>🦒 Giraffe</h1>
                    <p className={styles.subtitle}>
                        Система управління розважальним центром
                    </p>
                </div>

                <div className={styles.grid}>
                    {modules.map((module) => (
                        <Link key={module.href} href={module.href} className={styles.card}>
                            <div className={styles.cardIcon}>{module.icon}</div>
                            <h2 className={styles.cardTitle}>{module.title}</h2>
                            <p className={styles.cardDescription}>{module.description}</p>
                        </Link>
                    ))}
                </div>
            </main>
        </div>
    )
}
