```html
<!DOCTYPE html>

<html class="dark" lang="es"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>StreamHub - Domina tus chats en un solo lugar</title>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Spline+Sans:wght@300;400;500;600;700;800;900&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"/>
<script id="tailwind-config">
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    colors: {
                        "primary": "#af25f4",
                        "background-light": "#f7f5f8",
                        "background-dark": "#0a0a0a",
                        "surface-dark": "#1c1022",
                        "border-dark": "#332839",
                    },
                    fontFamily: {
                        "display": ["Spline Sans", "sans-serif"]
                    },
                    borderRadius: {
                        "DEFAULT": "0.25rem",
                        "lg": "0.5rem",
                        "xl": "0.75rem",
                        "full": "9999px"
                    },
                },
            },
        }
    </script>
<style>
        body {
            font-family: 'Spline Sans', sans-serif;
        }
        .glass-panel {
            background: rgba(28, 16, 34, 0.7);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(175, 37, 244, 0.2);
        }
        .hero-gradient {
            background: radial-gradient(circle at 50% 50%, rgba(175, 37, 244, 0.15) 0%, rgba(10, 10, 10, 1) 70%);
        }
    </style>
</head>
<body class="bg-background-light dark:bg-background-dark text-slate-900 dark:text-white transition-colors duration-300">
<div class="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden">
<!-- TopNavBar -->
<header class="sticky top-0 z-50 w-full border-b border-solid border-border-dark bg-background-dark/80 backdrop-blur-md px-6 lg:px-40 py-3">
<div class="mx-auto flex max-w-[1200px] items-center justify-between whitespace-nowrap">
<div class="flex items-center gap-3 text-white">
<div class="size-8 bg-primary rounded-lg flex items-center justify-center">
<span class="material-symbols-outlined text-white">hub</span>
</div>
<h2 class="text-white text-xl font-black leading-tight tracking-tight">StreamHub</h2>
</div>
<div class="flex flex-1 justify-end gap-8 items-center">
<nav class="hidden md:flex items-center gap-9">
<a class="text-white/80 hover:text-primary text-sm font-medium transition-colors" href="#">Funciones</a>
<a class="text-white/80 hover:text-primary text-sm font-medium transition-colors" href="#">Precios</a>
</nav>
<div class="flex gap-3">
<button class="hidden sm:flex min-w-[100px] cursor-pointer items-center justify-center rounded-lg h-10 px-4 bg-surface-dark text-white text-sm font-bold border border-border-dark hover:bg-surface-dark/80 transition-all">
<span>Iniciar Sesión</span>
</button>
<button class="flex min-w-[120px] cursor-pointer items-center justify-center rounded-lg h-10 px-5 bg-primary text-white text-sm font-bold shadow-[0_0_20px_rgba(175,37,244,0.4)] hover:scale-105 transition-all">
<span>Comenzar Gratis</span>
</button>
</div>
</div>
</div>
</header>
<main class="flex-1">
<!-- HeroSection -->
<section class="relative hero-gradient pt-16 pb-24 px-6 lg:px-40">
<div class="mx-auto max-w-[1200px] flex flex-col lg:flex-row items-center gap-12">
<div class="flex flex-col gap-8 flex-1 text-center lg:text-left">
<div class="inline-flex items-center self-center lg:self-start gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest">
<span class="relative flex h-2 w-2">
<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
<span class="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
</span>
                            Nueva Versión 2.0
                        </div>
<h1 class="text-white text-5xl md:text-7xl font-black leading-[1.1] tracking-[-0.04em]">
                            Domina tus chats en <span class="text-primary">un solo lugar</span>
</h1>
<p class="text-slate-400 text-lg md:text-xl font-normal leading-relaxed max-w-[600px] mx-auto lg:mx-0">
                            Gestiona las conversaciones de Twitch, YouTube, Kick y TikTok desde un único panel inteligente. Herramientas profesionales para streamers que buscan crecer.
                        </p>
<div class="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
<button class="flex min-w-[200px] cursor-pointer items-center justify-center rounded-xl h-14 px-8 bg-primary text-white text-lg font-bold shadow-[0_0_30px_rgba(175,37,244,0.5)] hover:bg-primary/90 transition-all">
<span>Comenzar Gratis</span>
</button>
<button class="flex min-w-[200px] cursor-pointer items-center justify-center rounded-xl h-14 px-8 bg-white/5 border border-white/10 text-white text-lg font-bold hover:bg-white/10 transition-all">
<span class="material-symbols-outlined mr-2">play_circle</span>
                                Ver Demo
                            </button>
</div>
</div>
<div class="flex-1 w-full max-w-[600px] lg:max-w-none relative">
<div class="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl glass-panel group">
<div class="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent pointer-events-none"></div>
<div class="w-full aspect-[4/3] bg-surface-dark flex flex-col" data-alt="High quality mockup of the unified streaming dashboard showing multiple chats">
<!-- Mockup Top Bar -->
<div class="h-8 bg-black/40 border-b border-white/5 flex items-center px-4 gap-2">
<div class="size-2 rounded-full bg-red-500/50"></div>
<div class="size-2 rounded-full bg-yellow-500/50"></div>
<div class="size-2 rounded-full bg-green-500/50"></div>
</div>
<!-- Mockup Content -->
<div class="flex flex-1 overflow-hidden">
<div class="w-12 border-r border-white/5 flex flex-col items-center py-4 gap-4">
<div class="size-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary"><span class="material-symbols-outlined text-sm">dashboard</span></div>
<div class="size-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-500"><span class="material-symbols-outlined text-sm">chat</span></div>
<div class="size-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-500"><span class="material-symbols-outlined text-sm">analytics</span></div>
</div>
<div class="flex-1 p-4 flex flex-col gap-4">
<div class="h-8 w-1/3 bg-white/5 rounded-lg"></div>
<div class="grid grid-cols-2 gap-4 flex-1">
<div class="rounded-lg bg-white/5 p-3 flex flex-col gap-2">
<div class="flex justify-between items-center"><div class="h-3 w-12 bg-purple-500/30 rounded"></div><div class="size-2 rounded-full bg-purple-500"></div></div>
<div class="space-y-2">
<div class="h-2 w-full bg-white/5 rounded"></div>
<div class="h-2 w-4/5 bg-white/5 rounded"></div>
</div>
</div>
<div class="rounded-lg bg-white/5 p-3 flex flex-col gap-2">
<div class="flex justify-between items-center"><div class="h-3 w-12 bg-red-500/30 rounded"></div><div class="size-2 rounded-full bg-red-500"></div></div>
<div class="space-y-2">
<div class="h-2 w-full bg-white/5 rounded"></div>
<div class="h-2 w-4/5 bg-white/5 rounded"></div>
</div>
</div>
<div class="col-span-2 rounded-lg bg-primary/5 border border-primary/20 p-4">
<div class="h-20 bg-gradient-to-r from-primary/20 to-transparent rounded"></div>
</div>
</div>
</div>
</div>
</div>
</div>
<!-- Decorative floating element -->
<div class="absolute -bottom-6 -left-6 bg-surface-dark border border-white/10 p-4 rounded-xl shadow-xl hidden md:block">
<div class="flex items-center gap-3">
<div class="size-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-500">
<span class="material-symbols-outlined">trending_up</span>
</div>
<div>
<p class="text-xs text-slate-400">Viewers Totales</p>
<p class="text-lg font-bold">12,482</p>
</div>
</div>
</div>
</div>
</div>
</section>
<!-- TextGrid / Integration -->
<section class="py-12 bg-surface-dark/50 border-y border-border-dark">
<div class="mx-auto max-w-[1200px] px-6 lg:px-40">
<p class="text-center text-slate-500 text-sm font-bold uppercase tracking-widest mb-10">Integración nativa con tus plataformas favoritas</p>
<div class="grid grid-cols-2 md:grid-cols-4 gap-6">
<div class="flex flex-1 gap-4 rounded-xl border border-border-dark bg-background-dark p-6 items-center hover:border-primary/50 transition-all cursor-default">
<div class="text-purple-500 flex items-center justify-center">
<span class="material-symbols-outlined text-3xl">videocam</span>
</div>
<h2 class="text-white text-xl font-bold leading-tight">Twitch</h2>
</div>
<div class="flex flex-1 gap-4 rounded-xl border border-border-dark bg-background-dark p-6 items-center hover:border-primary/50 transition-all cursor-default">
<div class="text-red-500 flex items-center justify-center">
<span class="material-symbols-outlined text-3xl">play_arrow</span>
</div>
<h2 class="text-white text-xl font-bold leading-tight">YouTube</h2>
</div>
<div class="flex flex-1 gap-4 rounded-xl border border-border-dark bg-background-dark p-6 items-center hover:border-primary/50 transition-all cursor-default">
<div class="text-slate-100 flex items-center justify-center">
<span class="material-symbols-outlined text-3xl">music_note</span>
</div>
<h2 class="text-white text-xl font-bold leading-tight">TikTok</h2>
</div>
<div class="flex flex-1 gap-4 rounded-xl border border-border-dark bg-background-dark p-6 items-center hover:border-primary/50 transition-all cursor-default">
<div class="text-green-500 flex items-center justify-center">
<span class="material-symbols-outlined text-3xl">bolt</span>
</div>
<h2 class="text-white text-xl font-bold leading-tight">Kick</h2>
</div>
</div>
</div>
</section>
<!-- FeatureSection -->
<section class="py-24 px-6 lg:px-40">
<div class="mx-auto max-w-[1200px]">
<div class="flex flex-col gap-4 mb-16 text-center">
<h2 class="text-white text-4xl md:text-5xl font-black tracking-tight">Lleva tu streaming al siguiente nivel</h2>
<p class="text-slate-400 text-lg max-w-[720px] mx-auto">Todo lo que necesitas para gestionar tu comunidad de forma eficiente y profesional sin cambiar de pestaña.</p>
</div>
<div class="grid grid-cols-1 md:grid-cols-3 gap-8">
<div class="flex flex-col gap-6 rounded-2xl border border-border-dark bg-surface-dark p-8 hover:bg-surface-dark/80 transition-all group">
<div class="size-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
<span class="material-symbols-outlined text-3xl">layers</span>
</div>
<div class="flex flex-col gap-3">
<h3 class="text-white text-2xl font-bold leading-tight">Conexión Multi-plataforma</h3>
<p class="text-slate-400 text-base leading-relaxed">Lee y responde chats de múltiples fuentes en una sola ventana optimizada para rendimiento.</p>
</div>
</div>
<div class="flex flex-col gap-6 rounded-2xl border border-border-dark bg-surface-dark p-8 hover:bg-surface-dark/80 transition-all group">
<div class="size-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
<span class="material-symbols-outlined text-3xl">monitoring</span>
</div>
<div class="flex flex-col gap-3">
<h3 class="text-white text-2xl font-bold leading-tight">Estadísticas en Vivo</h3>
<p class="text-slate-400 text-base leading-relaxed">Visualiza el crecimiento de tu audiencia y el engagement por plataforma en tiempo real.</p>
</div>
</div>
<div class="flex flex-col gap-6 rounded-2xl border border-border-dark bg-surface-dark p-8 hover:bg-surface-dark/80 transition-all group">
<div class="size-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
<span class="material-symbols-outlined text-3xl">auto_awesome</span>
</div>
<div class="flex flex-col gap-3">
<h3 class="text-white text-2xl font-bold leading-tight">Diseño Minimalista</h3>
<p class="text-slate-400 text-base leading-relaxed">Interfaz limpia y sin distracciones, diseñada por y para streamers profesionales.</p>
</div>
</div>
</div>
</div>
</section>
<!-- Stats -->
<section class="py-20 px-6 lg:px-40 bg-primary/5">
<div class="mx-auto max-w-[1200px]">
<div class="flex flex-wrap justify-center gap-8">
<div class="flex min-w-[240px] flex-1 flex-col gap-2 rounded-2xl p-8 border border-border-dark bg-background-dark text-center">
<p class="text-slate-400 text-base font-medium">Streamers Activos</p>
<p class="text-white text-5xl font-black leading-tight">10k+</p>
<p class="text-green-400 text-sm font-bold flex items-center justify-center gap-1">
<span class="material-symbols-outlined text-sm">trending_up</span> +15% este mes
                            </p>
</div>
<div class="flex min-w-[240px] flex-1 flex-col gap-2 rounded-2xl p-8 border border-border-dark bg-background-dark text-center">
<p class="text-slate-400 text-base font-medium">Mensajes Procesados</p>
<p class="text-white text-5xl font-black leading-tight">500M+</p>
<p class="text-green-400 text-sm font-bold flex items-center justify-center gap-1">
<span class="material-symbols-outlined text-sm">trending_up</span> +22% total
                            </p>
</div>
<div class="flex min-w-[240px] flex-1 flex-col gap-2 rounded-2xl p-8 border border-border-dark bg-background-dark text-center">
<p class="text-slate-400 text-base font-medium">Plataformas</p>
<p class="text-white text-5xl font-black leading-tight">4</p>
<p class="text-slate-500 text-sm font-bold">Próximamente más</p>
</div>
</div>
</div>
</section>
<!-- CTA Section -->
<section class="py-24 px-6 lg:px-40">
<div class="mx-auto max-w-[1000px] rounded-3xl bg-gradient-to-br from-primary to-purple-900 p-12 text-center relative overflow-hidden">
<div class="absolute inset-0 opacity-20 pointer-events-none" style="background-image: radial-gradient(circle at 2px 2px, white 1px, transparent 0); background-size: 24px 24px;"></div>
<div class="relative z-10 flex flex-col items-center gap-8">
<h2 class="text-white text-4xl md:text-5xl font-black leading-tight">¿Listo para mejorar tu stream?</h2>
<p class="text-white/80 text-lg md:text-xl max-w-xl">Únete a miles de creadores de contenido que ya optimizaron su flujo de trabajo con StreamHub.</p>
<div class="flex flex-col sm:flex-row gap-4">
<button class="px-10 h-14 bg-white text-primary rounded-xl font-black text-lg hover:scale-105 transition-transform shadow-xl">
                                Comenzar Gratis Ahora
                            </button>
<button class="px-10 h-14 bg-black/20 text-white border border-white/20 rounded-xl font-black text-lg hover:bg-black/30 transition-colors">
                                Hablar con Ventas
                            </button>
</div>
</div>
</div>
</section>
</main>
<!-- Footer -->
<footer class="border-t border-border-dark py-12 px-6 lg:px-40 bg-background-dark">
<div class="mx-auto max-w-[1200px] flex flex-col md:flex-row justify-between items-center gap-8">
<div class="flex items-center gap-3 text-white">
<div class="size-6 bg-primary rounded flex items-center justify-center">
<span class="material-symbols-outlined text-xs">hub</span>
</div>
<h2 class="text-white text-lg font-bold leading-tight">StreamHub</h2>
</div>
<div class="flex gap-8">
<a class="text-slate-500 hover:text-white transition-colors" href="#">Términos</a>
<a class="text-slate-500 hover:text-white transition-colors" href="#">Privacidad</a>
<a class="text-slate-500 hover:text-white transition-colors" href="#">Contacto</a>
</div>
<div class="text-slate-500 text-sm">
                    © 2024 StreamHub. Todos los derechos reservados.
                </div>
</div>
</footer>
</div>
</body></html>
```
