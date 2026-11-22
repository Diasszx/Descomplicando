---
name: "fono-ui-design-system"
description: "Guia canônico da Identidade Visual e Design System oficial da FonoGames. Define tokens semânticos (CSS variables e Tailwind), proíbe cores hardcodadas no JSX, padroniza superfícies (Branco Gelo, Bege Linho e Verde Sálvia), sidebar, layout dashboard e o componente GameCard."
compatibility: "React 18+, TypeScript, Tailwind CSS, shadcn/ui, Radix UI, Lucide Icons"
metadata:
  author: "fono-frontend-specialist"
  version: "4.0.0"
---

# FonoGames Design System & Identidade Visual

Este documento é a especificação canônica do **Design System** da **FonoGames** (Web e Mobile). Todos os componentes visuais, telas e fluxos devem seguir rigorosamente estas diretrizes.

---

## 1. Princípios de Engenharia de UI & Guardrails de Design

> [!IMPORTANT]
> **REGRA DE OURO — ZERO CORES HARDCODADAS NO JSX:**
> É expressamente **PROIBIDO** utilizar valores hexadecimais literais (`#F8FAFC`, `#527357`, etc.), códigos RGB soltos ou classes utilitárias arbitrárias (`bg-[#...]`) nos arquivos de código JSX/TSX.
> Todo componente DEVE consumir exclusivamente os **tokens semânticos** declarados em `src/index.css` e mapeados no `tailwind.config.js`.

* **Consistência Semântica:** A interface responde a temas e ajustes globais centralizados em CSS variables HSL.
* **Sensação Geral:** Visual clean, acolhedor, sereno e profissional para saúde e educação fonoaudiológica, priorizando conforto visual (tons de branco gelo, bege linho e verdes calmantes).
* **Bordas e Formas:** Cantos arredondados suaves (`rounded-2xl` para cards e containers principais, `rounded-xl` para banners internos e pílulas, `rounded-full` para botões circulares e tags).
* **Acessibilidade Inegociável:** Conformidade estrita com **WCAG AA** (contraste mínimo de 4.5:1 para texto normal, anéis de foco visíveis `focus-visible:ring-2 focus-visible:ring-ring` e navegação integral por teclado `Tab`, `Enter`, `Space`).
* **Plataforma 100% Livre de Anúncios (Zero Ads):** A plataforma não possui publicidade. É PROIBIDO criar componentes ou textos com "sem anúncios" / "no ads". O valor foca estritamente em recursos clínicos.

---

## 2. Paleta Oficial em Tokens Semânticos

Todos os valores são declarados como HSL em `apps/web/src/index.css` e expostos como classes utilitárias no `tailwind.config.js`:

| Papel Visual | Referência de Cor | Variável HSL (`index.css`) | Classe Tailwind | Onde Usar |
| :--- | :--- | :--- | :--- | :--- |
| **Fundo Geral** | Branco Puro (`#ffffff`) | `--background: 0 0% 100%` | `bg-background` | Fundo geral da página e workspace |
| **Containers & Painéis** | Cinza-Gelo Suave (`#f8fafc`) | `--card: 210 20% 98%` | `bg-card` | Containers secundários, métricas e painéis |
| **Prontuários & Clínico**| Branco Puro (`#ffffff`) | `--card-patient: 0 0% 100%` | `bg-card-patient` | Cards de prontuários e pacientes |
| **Ações Principais** | Azul Petróleo / Ardósia (`#335c67`) | `--primary: 193 34% 30%` | `bg-primary`, `text-primary` | Botões primários, ícones de destaque |
| **Hover & Foco Ativo** | Azul Petróleo Escuro (`#223e46`)| `--primary-hover: 193 38% 22%`| `hover:bg-primary-hover` | Hover de botões primários e itens ativos |
| **Textos & Títulos** | Preto Grafite (`#1d232a`) | `--foreground: 220 20% 14%` | `text-foreground` | Títulos e textos com alto contraste |
| **Destaque Secundário** | Ardósia Suave (`#64748b`) | `--muted-foreground: 215 16% 47%` | `text-muted-foreground` | Subtítulos, metadados e tags |
| **Bordas & Divisórias** | Mineral Neutro (`#e2e8f0`)| `--border: 220 13% 91%` | `border-border` | Bordas e divisores sutis |
| **Sidebar Base** | Preto Suave Grafite (`#181d24`)| `--sidebar-bg: 220 20% 12%` | `bg-sidebar` | Menu lateral escuro e elegante |
| **Sidebar Texto** | Branco / Gelo (`#f8fafc`) | `--sidebar-foreground: 210 20% 98%`| `text-sidebar-foreground` | Rótulos e itens do menu |
| **Sidebar Ativa** | Azul Petróleo (`#335c67`) | `--sidebar-active-bg: 193 34% 30%` | `bg-sidebar-active` | Pílula do item ativo |

---

## 3. Checklist de Validação do Design System

- [ ] **ZERO HARDCODED COLORS NO JSX:** Nenhuma classe `bg-[#...]` ou hexadecimais no TSX. Somente tokens como `bg-background`, `bg-card`, `bg-card-patient`, `bg-primary`, `text-foreground`, `border-border`.
- [ ] **HIERARQUIA DE SUPERFÍCIES:**
  - Fundo geral: `bg-background` (Branco gelo).
  - Painéis, sidebar e métricas: `bg-card` (Bege linho).
  - Prontuários e fichas clínicas: `bg-card-patient` (Branco puro) com `border-border`.
- [ ] **TIPOGRAFIA:** Textos principais com `text-foreground` (Musgo suave), sem preto puro.
- [ ] **INTERAÇÕES & HOVER:** Botões primários com `bg-primary` e `hover:bg-primary-hover`.
- [ ] **SEM ANÚNCIOS:** Nenhum texto ou botão de "no ads" ou "sem anúncios".
