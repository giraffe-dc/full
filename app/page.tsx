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
    const userRole = payload?.role ?? 'user'

    const modules = [
        { href: '/cash-register', icon: '💰', title: 'Каса', description: 'Продажі, чеки, звіти', roles: ['user', 'admin'] },
        { href: '/supply', icon: '📦', title: 'Постачання', description: 'Прихід товарів та інгредієнтів', roles: ['user', 'admin'] },
        { href: '/accounting', icon: '📊', title: 'Бухгалтерія', description: 'Фінанси, транзакції, аналітика', roles: ['admin'] },
        { href: '/staff', icon: '👥', title: 'Персонал', description: 'Співробітники, графіки, зарплати', roles: ['user', 'admin'] },
        { href: '/projects', icon: '📁', title: 'Проекти', description: 'Управління проектами', roles: ['user', 'admin'] },
        { href: '/docs', icon: '📄', title: 'Документи', description: 'Документація та файли', roles: ['user', 'admin'] },
        { href: '/visits', icon: '🕒', title: 'Відвідування', description: 'Реєстрація відвідувачів', roles: ['user', 'admin'] },
        { href: '/events', icon: '🎉', title: 'Події', description: 'Управління святковими подіями', roles: ['user', 'admin'] },
    ]

    const visibleModules = modules.filter(m => m.roles.includes(userRole))

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
                    {visibleModules.map((module) => (
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
