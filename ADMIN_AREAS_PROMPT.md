# MIGRATION PROMPT: ADMIN DASHBOARD — AREAS FEATURE

> **Mục đích:** Bổ sung tính năng **Areas** (khoanh vùng bản đồ) vào Admin Dashboard hiện tại.  
> **Tiền đề:** Admin Dashboard đã có sẵn Auth, Fields, Users, Matches theo `ADMIN_DASHBOARD_PROMPT.md` và `ADMIN_API_CONTRACT_PROMPT.md`.  
> **Chỉ đọc file này nếu** bạn đã xây dựng xong phần core dashboard. File này là **addendum** — không làm lại những gì đã có.

---

## 1. CONTEXT — AREAS LÀ GÌ?

Mỗi **GameMatch** có thể chứa nhiều **Areas** — là các vùng polygon được vẽ trên bản đồ bằng **Mapbox GL Draw** (frontend) và lưu dưới dạng PostGIS `geometry(POLYGON, 4326)` (backend).

**Ví dụ use case:**
- Admin vào trang chi tiết một match đang ở trạng thái `WAITING` hoặc `IN_PROGRESS`.
- Admin dùng bản đồ Mapbox để vẽ các vùng: Spawn Alpha, Spawn Bravo, Objective A, ...
- Mỗi vùng có màu sắc và loại riêng, hiển thị overlay trên bản đồ cho người chơi.

---

## 2. API CONTRACT — AREAS

### Base URL pattern
Tất cả Area API đều nested dưới match:
```
/v1/matches/{matchId}/areas
```

### Base Response Wrapper (giữ nguyên cấu trúc hiện có)
```typescript
// Đây là cấu trúc thực tế backend trả về (KHÔNG phải { success, message })
interface ApiResponse<T> {
  data: T;
  status: number;
  timestamp: string;
  code?: string;    // chỉ có khi lỗi
  message?: string; // chỉ có khi lỗi
}
```

---

### 2.1. GET — Lấy danh sách Areas của một Match

- **Method:** `GET`
- **URL:** `/v1/matches/{matchId}/areas`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Auth:** Bất kỳ user đã đăng nhập

**Response 200:**
```json
{
  "data": [
    {
      "id": "area-uuid-1",
      "matchId": "match-uuid-1",
      "name": "Alpha Spawn",
      "description": "Điểm xuất phát đội Alpha",
      "colorHex": "#3B82F6",
      "areaType": "SPAWN",
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [106.700, 10.800],
            [106.710, 10.800],
            [106.710, 10.810],
            [106.700, 10.810],
            [106.700, 10.800]
          ]
        ]
      },
      "createdAt": "2026-06-03T10:00:00Z"
    },
    {
      "id": "area-uuid-2",
      "matchId": "match-uuid-1",
      "name": "Objective A",
      "description": null,
      "colorHex": "#EF4444",
      "areaType": "OBJECTIVE",
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [106.705, 10.805],
            [106.707, 10.805],
            [106.707, 10.807],
            [106.705, 10.807],
            [106.705, 10.805]
          ]
        ]
      },
      "createdAt": "2026-06-03T10:05:00Z"
    }
  ],
  "status": 200,
  "timestamp": "2026-06-03T10:10:00Z"
}
```

---

### 2.2. POST — Tạo Area mới

- **Method:** `POST`
- **URL:** `/v1/matches/{matchId}/areas`
- **Headers:** `Authorization: Bearer <accessToken>`, `Content-Type: application/json`
- **Auth:** Admin only

**Request Body:**
```json
{
  "name": "Alpha Spawn",
  "description": "Điểm xuất phát đội Alpha",
  "colorHex": "#3B82F6",
  "areaType": "SPAWN",
  "geometry": {
    "type": "Polygon",
    "coordinates": [
      [
        [106.700, 10.800],
        [106.710, 10.800],
        [106.710, 10.810],
        [106.700, 10.810],
        [106.700, 10.800]
      ]
    ]
  }
}
```

**Field rules:**
| Field | Type | Required | Validation |
|---|---|---|---|
| `name` | string | ✅ | max 100 chars |
| `description` | string | ❌ | max 500 chars |
| `colorHex` | string | ❌ | hex regex `#[0-9A-Fa-f]{6}`, default `#FF5733` |
| `areaType` | enum | ❌ | `SPAWN \| OBJECTIVE \| BOUNDARY \| DANGER \| ZONE`, default `ZONE` |
| `geometry` | GeoJSON Polygon | ✅ | type phải là `"Polygon"`, tối thiểu 4 tọa độ |

**Response 201:**
```json
{
  "data": {
    "id": "area-uuid-1",
    "matchId": "match-uuid-1",
    "name": "Alpha Spawn",
    "description": "Điểm xuất phát đội Alpha",
    "colorHex": "#3B82F6",
    "areaType": "SPAWN",
    "geometry": { "type": "Polygon", "coordinates": [[...]] },
    "createdAt": "2026-06-03T10:00:00Z"
  },
  "status": 201,
  "timestamp": "2026-06-03T10:00:00Z"
}
```

---

### 2.3. GET — Lấy chi tiết một Area

- **Method:** `GET`
- **URL:** `/v1/matches/{matchId}/areas/{areaId}`
- **Headers:** `Authorization: Bearer <accessToken>`

**Response 200:** Trả về object Area giống mục 2.2.

---

### 2.4. PUT — Cập nhật Area (Partial Update)

- **Method:** `PUT`
- **URL:** `/v1/matches/{matchId}/areas/{areaId}`
- **Headers:** `Authorization: Bearer <accessToken>`, `Content-Type: application/json`
- **Auth:** Admin only

**Request Body (chỉ gửi field cần thay đổi):**
```json
{
  "name": "Bravo Spawn",
  "colorHex": "#EF4444"
}
```

Hoặc cập nhật cả polygon:
```json
{
  "geometry": {
    "type": "Polygon",
    "coordinates": [[...tọa độ mới...]]
  }
}
```

**Response 200:** Trả về Area đã cập nhật.

---

### 2.5. DELETE — Xóa Area

- **Method:** `DELETE`
- **URL:** `/v1/matches/{matchId}/areas/{areaId}`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Auth:** Admin only

**Response 204:** No content.

---

### 2.6. Error Responses

```json
// 404 — Match hoặc Area không tồn tại
{
  "status": 404,
  "code": "NOT_FOUND",
  "message": "Area không tồn tại: <areaId>",
  "timestamp": "2026-06-03T10:00:00Z"
}

// 422 — Polygon không hợp lệ
{
  "status": 422,
  "code": "INVALID_POLYGON",
  "message": "Polygon không hợp lệ (tự cắt nhau hoặc ring không đóng)",
  "timestamp": "2026-06-03T10:00:00Z"
}

// 403 — Không phải admin
{
  "status": 403,
  "code": "INSUFFICIENT_ROLE",
  "message": "Chỉ admin mới được thực hiện thao tác này",
  "timestamp": "2026-06-03T10:00:00Z"
}
```

---

## 3. TYPESCRIPT TYPES — TẠO MỚI

Thêm vào file `src/types/api.ts` hiện có:

```typescript
// ─── GeoJSON ──────────────────────────────────────────────────────────────────

// Coordinate order: [longitude, latitude] — GeoJSON spec RFC 7946
export type GeoJsonCoordinate = [number, number];
export type GeoJsonRing = GeoJsonCoordinate[];

export interface GeoJsonPolygon {
  type: 'Polygon';
  coordinates: GeoJsonRing[]; // [outerRing, ...holes]
}

// ─── Area ─────────────────────────────────────────────────────────────────────

export type AreaType = 'SPAWN' | 'OBJECTIVE' | 'BOUNDARY' | 'DANGER' | 'ZONE';

export interface Area {
  id: string;
  matchId: string;
  name: string;
  description: string | null;
  colorHex: string;
  areaType: AreaType;
  geometry: GeoJsonPolygon;
  createdAt: string;
}

export interface CreateAreaRequest {
  name: string;
  description?: string;
  colorHex?: string;
  areaType?: AreaType;
  geometry: GeoJsonPolygon;
}

export interface UpdateAreaRequest {
  name?: string;
  description?: string;
  colorHex?: string;
  areaType?: AreaType;
  geometry?: GeoJsonPolygon;
}

// ─── Area Type metadata (dùng cho UI labels/colors) ───────────────────────────

export const AREA_TYPE_CONFIG: Record<AreaType, { label: string; defaultColor: string }> = {
  SPAWN:     { label: 'Spawn',    defaultColor: '#3B82F6' }, // blue
  OBJECTIVE: { label: 'Mục tiêu', defaultColor: '#EF4444' }, // red
  BOUNDARY:  { label: 'Biên giới', defaultColor: '#F59E0B' }, // amber
  DANGER:    { label: 'Nguy hiểm', defaultColor: '#DC2626' }, // red-600
  ZONE:      { label: 'Vùng',     defaultColor: '#6B7280' }, // gray
};
```

---

## 4. REACT QUERY HOOKS — TẠO MỚI

Tạo file `src/hooks/api/useAreas.ts`:

```typescript
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@/lib/axios'; // axios instance đã có auth interceptor
import type { Area, CreateAreaRequest, UpdateAreaRequest } from '@/types/api';

// Query key factory — giúp invalidation chính xác
const areaKeys = {
  all: (matchId: string) => ['areas', matchId] as const,
  detail: (matchId: string, areaId: string) => ['areas', matchId, areaId] as const,
};

// ─── GET list ─────────────────────────────────────────────────────────────────
export function useAreas(matchId: string) {
  return useQuery({
    queryKey: areaKeys.all(matchId),
    queryFn: async () => {
      const res = await axios.get<{ data: Area[] }>(`/v1/matches/${matchId}/areas`);
      return res.data.data;
    },
    enabled: !!matchId,
  });
}

// ─── GET detail ───────────────────────────────────────────────────────────────
export function useArea(matchId: string, areaId: string) {
  return useQuery({
    queryKey: areaKeys.detail(matchId, areaId),
    queryFn: async () => {
      const res = await axios.get<{ data: Area }>(`/v1/matches/${matchId}/areas/${areaId}`);
      return res.data.data;
    },
    enabled: !!matchId && !!areaId,
  });
}

// ─── CREATE ───────────────────────────────────────────────────────────────────
export function useCreateArea(matchId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateAreaRequest) => {
      const res = await axios.post<{ data: Area }>(`/v1/matches/${matchId}/areas`, payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: areaKeys.all(matchId) });
    },
  });
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────
export function useUpdateArea(matchId: string, areaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateAreaRequest) => {
      const res = await axios.put<{ data: Area }>(`/v1/matches/${matchId}/areas/${areaId}`, payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: areaKeys.all(matchId) });
    },
  });
}

// ─── DELETE ───────────────────────────────────────────────────────────────────
export function useDeleteArea(matchId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (areaId: string) => {
      await axios.delete(`/v1/matches/${matchId}/areas/${areaId}`);
      return areaId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: areaKeys.all(matchId) });
    },
  });
}
```

---

## 5. DEPENDENCIES CẦN THÊM

```bash
npm install mapbox-gl @mapbox/mapbox-gl-draw
npm install -D @types/mapbox-gl @types/mapbox__mapbox-gl-draw
```

Thêm vào `next.config.js` để tránh lỗi SSR với Mapbox:
```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... config hiện có ...
  transpilePackages: ['mapbox-gl'],
};
```

---

## 6. UI COMPONENTS — TẠO MỚI

### 6.1. Component: `MapboxAreaEditor`

Đây là component cốt lõi — nhúng bản đồ Mapbox + Draw tool. Tạo tại `src/components/areas/MapboxAreaEditor.tsx`:

```tsx
'use client';
// NOTE: Import Mapbox CSS trong layout hoặc global.css:
// @import 'mapbox-gl/dist/mapbox-gl.css';
// @import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';

import { useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import type { Area, GeoJsonPolygon } from '@/types/api';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

interface MapboxAreaEditorProps {
  areas: Area[];                            // Danh sách areas hiện có để render
  center?: [number, number];               // [lng, lat] — default: Hà Nội
  onPolygonComplete: (polygon: GeoJsonPolygon) => void; // Callback khi vẽ xong
  onAreaClick?: (area: Area) => void;      // Callback khi click vào area
  readOnly?: boolean;                      // true = chỉ xem, không vẽ được
}

export function MapboxAreaEditor({
  areas,
  center = [105.8412, 21.0245],
  onPolygonComplete,
  onAreaClick,
  readOnly = false,
}: MapboxAreaEditorProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Khởi tạo map
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center,
      zoom: 15,
    });

    // Thêm Draw tool (chỉ khi không phải readOnly)
    if (!readOnly) {
      const draw = new MapboxDraw({
        displayControlsDefault: false,
        controls: { polygon: true, trash: true },
        defaultMode: 'simple_select',
      });
      map.addControl(draw);
      drawRef.current = draw;

      // Lắng nghe sự kiện vẽ xong polygon
      map.on('draw.create', (e) => {
        const feature = e.features[0];
        if (feature?.geometry?.type === 'Polygon') {
          onPolygonComplete(feature.geometry as GeoJsonPolygon);
          draw.deleteAll(); // Xóa drawing tạm sau khi capture
        }
      });
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []); // chỉ chạy 1 lần

  // Render các areas hiện có lên bản đồ
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    // Xóa layer/source cũ trước khi re-render
    areas.forEach((_, i) => {
      const id = `area-fill-${i}`;
      if (map.getLayer(id)) map.removeLayer(id);
      if (map.getLayer(`area-outline-${i}`)) map.removeLayer(`area-outline-${i}`);
      if (map.getSource(id)) map.removeSource(id);
    });

    // Render từng area
    areas.forEach((area, i) => {
      const sourceId = `area-fill-${i}`;
      map.addSource(sourceId, {
        type: 'geojson',
        data: { type: 'Feature', geometry: area.geometry, properties: { id: area.id, name: area.name } },
      });

      // Fill polygon (bán trong suốt)
      map.addLayer({
        id: sourceId,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': area.colorHex,
          'fill-opacity': 0.3,
        },
      });

      // Outline polygon
      map.addLayer({
        id: `area-outline-${i}`,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': area.colorHex,
          'line-width': 2,
        },
      });

      // Click handler
      if (onAreaClick) {
        map.on('click', sourceId, () => onAreaClick(area));
        map.on('mouseenter', sourceId, () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', sourceId, () => { map.getCanvas().style.cursor = ''; });
      }
    });
  }, [areas]);

  return <div ref={mapContainerRef} className="w-full h-full min-h-[400px] rounded-lg" />;
}
```

### 6.2. Component: `AreaFormDialog`

Dialog tạo/chỉnh sửa area sau khi vẽ polygon. Tạo tại `src/components/areas/AreaFormDialog.tsx`:

```tsx
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import type { Area, AreaType, GeoJsonPolygon, CreateAreaRequest } from '@/types/api';
import { AREA_TYPE_CONFIG } from '@/types/api';

const schema = z.object({
  name:        z.string().min(1, 'Tên không được để trống').max(100),
  description: z.string().max(500).optional(),
  colorHex:    z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Mã hex không hợp lệ'),
  areaType:    z.enum(['SPAWN', 'OBJECTIVE', 'BOUNDARY', 'DANGER', 'ZONE']),
});

type FormValues = z.infer<typeof schema>;

interface AreaFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateAreaRequest) => void;
  pendingGeometry: GeoJsonPolygon | null; // polygon vừa vẽ
  editingArea?: Area | null;              // null = tạo mới, có giá trị = chỉnh sửa
  isLoading?: boolean;
}

export function AreaFormDialog({
  open, onClose, onSubmit, pendingGeometry, editingArea, isLoading
}: AreaFormDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: editingArea
      ? { name: editingArea.name, description: editingArea.description ?? '', colorHex: editingArea.colorHex, areaType: editingArea.areaType }
      : { name: '', description: '', colorHex: '#FF5733', areaType: 'ZONE' },
  });

  const handleSubmit = (values: FormValues) => {
    const geometry = pendingGeometry ?? editingArea?.geometry;
    if (!geometry) return;
    onSubmit({ ...values, geometry });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editingArea ? 'Chỉnh sửa Area' : 'Tạo Area mới'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Tên</FormLabel>
                <FormControl><Input placeholder="VD: Alpha Spawn" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="areaType" render={({ field }) => (
              <FormItem>
                <FormLabel>Loại vùng</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    {(Object.keys(AREA_TYPE_CONFIG) as AreaType[]).map(type => (
                      <SelectItem key={type} value={type}>{AREA_TYPE_CONFIG[type].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="colorHex" render={({ field }) => (
              <FormItem>
                <FormLabel>Màu sắc</FormLabel>
                <FormControl>
                  <div className="flex gap-2 items-center">
                    <input type="color" value={field.value} onChange={e => field.onChange(e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border" />
                    <Input value={field.value} onChange={field.onChange} className="font-mono" />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Mô tả (tùy chọn)</FormLabel>
                <FormControl><Input placeholder="Mô tả ngắn..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Hủy</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Đang lưu...' : 'Lưu'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

### 6.3. Component: `AreaList`

Sidebar hiển thị danh sách areas + nút xóa. Tạo tại `src/components/areas/AreaList.tsx`:

```tsx
'use client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, Edit } from 'lucide-react';
import type { Area } from '@/types/api';
import { AREA_TYPE_CONFIG } from '@/types/api';

interface AreaListProps {
  areas: Area[];
  onEdit: (area: Area) => void;
  onDelete: (areaId: string) => void;
  onHover?: (area: Area | null) => void;
}

export function AreaList({ areas, onEdit, onDelete, onHover }: AreaListProps) {
  if (areas.length === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground py-8">
        Chưa có vùng nào. Dùng công cụ vẽ trên bản đồ để tạo.
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {areas.map(area => (
        <li key={area.id}
          className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
          onMouseEnter={() => onHover?.(area)}
          onMouseLeave={() => onHover?.(null)}
        >
          {/* Màu indicator */}
          <div className="w-4 h-4 rounded-full flex-shrink-0 border border-white/20 shadow"
            style={{ backgroundColor: area.colorHex }} />

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{area.name}</p>
            <Badge variant="outline" className="text-xs mt-0.5">
              {AREA_TYPE_CONFIG[area.areaType].label}
            </Badge>
          </div>

          {/* Actions */}
          <div className="flex gap-1 flex-shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(area)}>
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => onDelete(area.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
```

---

## 7. TRANG TÍCH HỢP — Match Detail với Areas

Tạo trang `src/app/(dashboard)/matches/[matchId]/areas/page.tsx`:

```tsx
'use client';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner'; // hoặc toast library bạn đang dùng
import { MapboxAreaEditor } from '@/components/areas/MapboxAreaEditor';
import { AreaFormDialog } from '@/components/areas/AreaFormDialog';
import { AreaList } from '@/components/areas/AreaList';
import { useAreas, useCreateArea, useUpdateArea, useDeleteArea } from '@/hooks/api/useAreas';
import type { Area, GeoJsonPolygon, CreateAreaRequest } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export default function MatchAreasPage() {
  const { matchId } = useParams<{ matchId: string }>();

  // State
  const [pendingPolygon, setPendingPolygon] = useState<GeoJsonPolygon | null>(null);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Queries & Mutations
  const { data: areas = [], isLoading } = useAreas(matchId);
  const createMutation = useCreateArea(matchId);
  const updateMutation = useUpdateArea(matchId, editingArea?.id ?? '');
  const deleteMutation = useDeleteArea(matchId);

  // Vẽ xong polygon → mở dialog nhập thông tin
  const handlePolygonComplete = (polygon: GeoJsonPolygon) => {
    setPendingPolygon(polygon);
    setEditingArea(null);
    setDialogOpen(true);
  };

  // Submit form tạo/cập nhật
  const handleFormSubmit = async (data: CreateAreaRequest) => {
    try {
      if (editingArea) {
        await updateMutation.mutateAsync(data);
        toast.success('Đã cập nhật area');
      } else {
        await createMutation.mutateAsync(data);
        toast.success('Đã tạo area mới');
      }
      setDialogOpen(false);
      setPendingPolygon(null);
      setEditingArea(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Có lỗi xảy ra');
    }
  };

  // Click vào area trong list → mở dialog chỉnh sửa
  const handleEdit = (area: Area) => {
    setEditingArea(area);
    setPendingPolygon(null);
    setDialogOpen(true);
  };

  // Xóa area
  const handleDelete = async (areaId: string) => {
    if (!confirm('Xóa area này?')) return;
    try {
      await deleteMutation.mutateAsync(areaId);
      toast.success('Đã xóa area');
    } catch {
      toast.error('Không thể xóa area');
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex gap-4 p-4">
      {/* Bên trái: Bản đồ */}
      <div className="flex-1 rounded-xl overflow-hidden border">
        <MapboxAreaEditor
          areas={areas}
          onPolygonComplete={handlePolygonComplete}
          onAreaClick={handleEdit}
        />
      </div>

      {/* Bên phải: Danh sách areas */}
      <div className="w-72 flex flex-col gap-4">
        <div>
          <h2 className="font-semibold text-lg">Vùng bản đồ</h2>
          <p className="text-sm text-muted-foreground">
            Dùng công cụ polygon trên bản đồ để vẽ vùng mới.
          </p>
        </div>
        <Separator />
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Đang tải...</p>
        ) : (
          <AreaList
            areas={areas}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      </div>

      {/* Dialog tạo/chỉnh sửa */}
      <AreaFormDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setPendingPolygon(null); setEditingArea(null); }}
        onSubmit={handleFormSubmit}
        pendingGeometry={pendingPolygon}
        editingArea={editingArea}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
```

---

## 8. NAVIGATION — TÍCH HỢP VÀO MATCH DETAIL PAGE

Trong trang `/matches/[matchId]` hiện có, thêm link hoặc tab dẫn đến `/matches/[matchId]/areas`:

```tsx
// Thêm vào Match Detail page
import Link from 'next/link';
import { Map } from 'lucide-react';

// Trong JSX, sau các button Start/End match:
<Button variant="outline" asChild>
  <Link href={`/matches/${matchId}/areas`}>
    <Map className="mr-2 h-4 w-4" />
    Quản lý vùng bản đồ ({areaCount})
  </Link>
</Button>
```

---

## 9. ENVIRONMENT VARIABLE CẦN THÊM

Thêm vào `.env.local`:
```bash
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1IjoiLi4uIn0...  # Lấy từ mapbox.com
```

---

## 10. CHECKLIST TRƯỚC KHI TEST

- [ ] `NEXT_PUBLIC_MAPBOX_TOKEN` đã được set trong `.env.local`
- [ ] Import CSS của Mapbox trong `app/globals.css`:
  ```css
  @import 'mapbox-gl/dist/mapbox-gl.css';
  @import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
  ```
- [ ] `MapboxAreaEditor` được import với `dynamic` (Next.js App Router yêu cầu để tránh SSR lỗi):
  ```tsx
  import dynamic from 'next/dynamic';
  const MapboxAreaEditor = dynamic(
    () => import('@/components/areas/MapboxAreaEditor').then(m => m.MapboxAreaEditor),
    { ssr: false }
  );
  ```
- [ ] Backend đang chạy tại `http://localhost:8080`
- [ ] Supabase đã bật PostGIS extension
- [ ] Migration V7 đã chạy thành công (`game_areas` table tồn tại)
- [ ] JWT token admin hợp lệ khi gọi POST/PUT/DELETE
