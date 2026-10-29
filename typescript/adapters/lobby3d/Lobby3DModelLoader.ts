import { logger } from "../web/shared/Logger";

export class Lobby3DModelLoader {
    private program!: WebGLProgram;
    private vertexBuffer!: WebGLBuffer;
    private indexBuffer!: WebGLBuffer;
    private indexCount: number = 0;
    
    private uTime!: WebGLUniformLocation | null;
    private uRotation!: WebGLUniformLocation | null;

    constructor(private gl: WebGLRenderingContext) {}

    public initialize(): void {
        this.buildShaders();
        this.buildGlobe();
    }

    private buildShaders(): void {
        const gl = this.gl;

        const vsSource = `
            attribute vec3 aPosition;
            attribute vec2 aTexCoord;
            uniform float uRotation;
            varying vec2 vTexCoord;
            varying float vFresnel;
            varying vec3 vNormal;

            mat3 rotateY(float angle) {
                float c = cos(angle); float s = sin(angle);
                return mat3(c, 0.0, s, 0.0, 1.0, 0.0, -s, 0.0, c);
            }

            void main() {
                vec3 rotated = rotateY(uRotation) * aPosition;
                vec3 normal = normalize(rotated);
                float z = rotated.z + 2.5;
                float fov = 1.2;
                vec2 projected = rotated.xy / z * fov;
                gl_Position = vec4(projected, -rotated.z * 0.1, 1.0);
                vTexCoord = aTexCoord;
                vNormal = normal;
                vec3 viewDir = normalize(vec3(0.0, 0.0, 1.0) - rotated);
                vFresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.5);
            }
        `;

        const fsSource = `
            precision mediump float;
            varying vec2 vTexCoord;
            varying float vFresnel;
            varying vec3 vNormal;
            uniform float uTime;

            float hash(vec2 p) {
                p = fract(p * vec2(127.1, 311.7));
                p += dot(p, p + 19.19);
                return fract(p.x * p.y);
            }
            float noise(vec2 p) {
                vec2 i = floor(p); vec2 f = fract(p);
                vec2 u = f * f * (3.0 - 2.0 * f);
                return mix(mix(hash(i), hash(i + vec2(1,0)), u.x),
                           mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
            }
            float fbm(vec2 p) {
                float v = 0.0; float a = 0.5;
                for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.1; a *= 0.5; }
                return v;
            }

            void main() {
                vec2 uv = vTexCoord;

                float continent = fbm(uv * 4.0 + vec2(1.3, 0.7));
                float detail = fbm(uv * 10.0 + vec2(continent));
                float land = smoothstep(0.48, 0.55, continent + detail * 0.15);

                vec3 deepOcean  = vec3(0.03, 0.07, 0.22);
                vec3 shallowSea = vec3(0.05, 0.18, 0.40);
                vec3 oceanColor = mix(deepOcean, shallowSea, fbm(uv * 6.0) * 0.8);

                vec3 lowLand  = vec3(0.18, 0.32, 0.08);
                vec3 highland = vec3(0.28, 0.22, 0.12);
                vec3 snow     = vec3(0.88, 0.92, 0.95);
                float elevation = fbm(uv * 8.0 + 3.1);
                vec3 landColor  = mix(lowLand, highland, smoothstep(0.4, 0.7, elevation));
                landColor       = mix(landColor, snow, smoothstep(0.7, 0.85, elevation));

                vec3 globeColor = mix(oceanColor, landColor, land);

                vec3 lightDir = normalize(vec3(-0.5, 0.8, 0.6));
                float diffuse = max(dot(vNormal, lightDir), 0.0);
                float ambient = 0.15;
                globeColor = globeColor * (ambient + diffuse * 0.85);

                if (land < 0.5) {
                    vec3 viewDir = normalize(vec3(0.0, 0.0, 1.0));
                    vec3 reflectDir = reflect(-lightDir, vNormal);
                    float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
                    globeColor += vec3(0.1, 0.15, 0.4) * spec;
                }

                float clouds = fbm(uv * 5.0 + vec2(uTime * 0.006, 0.0));
                float cloudMask = smoothstep(0.52, 0.65, clouds);
                globeColor = mix(globeColor, vec3(0.85, 0.88, 0.92), cloudMask * 0.85);

                vec3 atmosphere = vec3(0.15, 0.45, 0.95);
                globeColor = mix(globeColor, atmosphere, vFresnel * 0.75);

                float aurora = vFresnel * (0.4 + 0.3 * sin(uTime * 0.3));
                globeColor += vec3(0.0, 0.4, 0.8) * aurora * 0.3;

                gl_FragColor = vec4(globeColor, 1.0);
            }
        `;

        const vs = this.compileShader(gl.VERTEX_SHADER, vsSource)!;
        const fs = this.compileShader(gl.FRAGMENT_SHADER, fsSource)!;

        this.program = gl.createProgram()!;
        gl.attachShader(this.program, vs);
        gl.attachShader(this.program, fs);
        gl.linkProgram(this.program);

        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            logger.log('error', `[Lobby3D] Falha ao linkar shader: ${gl.getProgramInfoLog(this.program)}`);
        }

        this.uTime       = gl.getUniformLocation(this.program, 'uTime');
        this.uRotation   = gl.getUniformLocation(this.program, 'uRotation');
    }

    private compileShader(type: number, source: string): WebGLShader | null {
        const gl = this.gl;
        const shader = gl.createShader(type)!;
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            logger.log('error', `[Lobby3D] Shader compile error: ${gl.getShaderInfoLog(shader)}`);
            return null;
        }
        return shader;
    }

    private buildGlobe(): void {
        const gl = this.gl;
        const latBands = 48;
        const lonBands = 64;

        const positions: number[] = [];
        const texCoords: number[] = [];
        const indices: number[] = [];

        for (let lat = 0; lat <= latBands; lat++) {
            const theta = (lat / latBands) * Math.PI;
            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);

            for (let lon = 0; lon <= lonBands; lon++) {
                const phi = (lon / lonBands) * 2 * Math.PI;
                const x = Math.cos(phi) * sinTheta;
                const y = cosTheta;
                const z = Math.sin(phi) * sinTheta;

                positions.push(x, y, z);
                texCoords.push(lon / lonBands, lat / latBands);
            }
        }

        for (let lat = 0; lat < latBands; lat++) {
            for (let lon = 0; lon < lonBands; lon++) {
                const first  = lat * (lonBands + 1) + lon;
                const second = first + lonBands + 1;
                indices.push(first, second, first + 1, second, second + 1, first + 1);
            }
        }

        this.indexCount = indices.length;

        const interleaved: number[] = [];
        for (let i = 0; i < positions.length / 3; i++) {
            interleaved.push(positions[i * 3]!, positions[i * 3 + 1]!, positions[i * 3 + 2]!);
            interleaved.push(texCoords[i * 2]!, texCoords[i * 2 + 1]!);
        }

        this.vertexBuffer = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(interleaved), gl.STATIC_DRAW);

        this.indexBuffer = gl.createBuffer()!;
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    }

    public draw(elapsed: number, rotation: number): void {
        const gl = this.gl;
        gl.useProgram(this.program);

        gl.uniform1f(this.uTime, elapsed * 0.001);
        gl.uniform1f(this.uRotation, rotation);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

        const STRIDE = 5 * 4;
        const aPos = gl.getAttribLocation(this.program, 'aPosition');
        const aTex = gl.getAttribLocation(this.program, 'aTexCoord');
        gl.enableVertexAttribArray(aPos);
        gl.enableVertexAttribArray(aTex);
        gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, STRIDE, 0);
        gl.vertexAttribPointer(aTex, 2, gl.FLOAT, false, STRIDE, 12);

        gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);
    }

    public destroy(): void {
        const gl = this.gl;
        gl.deleteBuffer(this.vertexBuffer);
        gl.deleteBuffer(this.indexBuffer);
        gl.deleteProgram(this.program);
    }
}
