# Timeline OS - Restructure Plan

## New Directory Structure

```
timeline-os/
├── src/
│   ├── app/                    # Core app files
│   ├── features/               # Feature-based modules
│   │   ├── auth/
│   │   ├── events/
│   │   ├── analytics/
│   │   └── subscription/
│   ├── components/             # Shared UI components
│   │   ├── ui/
│   │   ├── charts/
│   │   └── layouts/
│   ├── services/               # API & business logic
│   ├── utils/                  # Helper functions
│   ├── constants/              # Constants & config
│   ├── types/                  # TypeScript types
│   └── pages/                  # Route pages
│
├── database/                   # Database related
│   ├── migrations/
│   ├── scripts/
│   └── schemas/
│
├── docs/                       # Documentation
│   ├── guides/
│   ├── planning/
│   ├── fixes/
│   └── launch/
│
├── public/                     # Static assets
├── tests/                      # Test files
├── .claude/                    # Claude Code skills
└── config/                     # Root configuration
```

## Migration Steps

1. Create new directory structure
2. Move files to appropriate locations
3. Update import paths in all files
4. Update build configuration
5. Test build
6. Commit changes

