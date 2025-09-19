import type { Point } from '../types';

// Calculates the Euclidean distance between two points
export const distance = (p1: Point, p2: Point): number => {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
};

// --- Ear Clipping Triangulation Algorithm ---
// Takes a simple polygon (as an array of points) and returns an array of triangles that partition it.

// Helper to calculate the signed area (determinant) of a triangle
const signedArea = (p1: Point, p2: Point, p3: Point): number => {
    return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
};

// Helper to check if a point is inside a triangle
const isPointInTriangle = (pt: Point, v1: Point, v2: Point, v3: Point): boolean => {
    const d1 = signedArea(pt, v1, v2);
    const d2 = signedArea(pt, v2, v3);
    const d3 = signedArea(pt, v3, v1);
    const has_neg = (d1 < 0) || (d2 < 0) || (d3 < 0);
    const has_pos = (d1 > 0) || (d2 > 0) || (d3 > 0);
    return !(has_neg && has_pos);
};

export const earClippingTriangulation = (polygon: Point[]): [Point, Point, Point][] => {
  const triangles: [Point, Point, Point][] = [];
  if (polygon.length < 3) return [];

  // Make a mutable copy of the polygon vertices
  let vertices = [...polygon];

  // Ensure polygon is wound counter-clockwise (CCW) for consistent ear detection.
  // Calculate polygon area; if negative, it's clockwise.
  let area = 0;
  for (let i = 0; i < vertices.length; i++) {
    const p1 = vertices[i];
    const p2 = vertices[(i + 1) % vertices.length];
    area += (p1.x * p2.y - p2.x * p1.y);
  }
  if (area > 0) {
    vertices.reverse();
  }
  
  const indices = vertices.map((_, i) => i);

  let iterations = 0;
  while (indices.length > 3 && iterations < polygon.length * 2) {
    let earFound = false;
    for (let i = 0; i < indices.length; i++) {
        const prev_i = indices[(i + indices.length - 1) % indices.length];
        const curr_i = indices[i];
        const next_i = indices[(i + 1) % indices.length];
        
        const p_prev = vertices[prev_i];
        const p_curr = vertices[curr_i];
        const p_next = vertices[next_i];
        
        // Check if the vertex is convex (forms an interior angle < 180 degrees)
        if (signedArea(p_prev, p_curr, p_next) >= 0) {
            let isEar = true;
            // Check if any other vertex is inside this potential ear triangle
            for (let j = 0; j < vertices.length; j++) {
                if (j !== prev_i && j !== curr_i && j !== next_i) {
                    if (isPointInTriangle(vertices[j], p_prev, p_curr, p_next)) {
                        isEar = false;
                        break;
                    }
                }
            }
            
            if (isEar) {
                triangles.push([p_prev, p_curr, p_next]);
                indices.splice(i, 1);
                earFound = true;
                break; 
            }
        }
    }
    if (!earFound) {
      // Failsafe for complex or self-intersecting polygons
      console.error("Triangulation failed: No ear found. The polygon might be self-intersecting.");
      break;
    }
    iterations++;
  }
  
  // Add the final remaining triangle
  triangles.push([vertices[indices[0]], vertices[indices[1]], vertices[indices[2]]]);

  return triangles;
};
