struct ObjectData {
    model: mat4x4<f32>,
};

struct SimData {
    position: vec3<f32>,
    amplitude: f32,
    frequency: f32,
    time: f32,
    angle: f32,
    _pad: f32,  // вирівнювання структури до 32 байт
};

@binding(0) @group(0) var<storage, read_write> objects: array<ObjectData>;
@binding(1) @group(0) var<storage, read_write> simData: array<SimData>;
@binding(2) @group(0) var<uniform> deltaTime: f32;

const PI: f32 = 3.14159265;

fn Deg2Rad(deg: f32) -> f32 {
    return deg * PI / 180.0;
}

@compute @workgroup_size(64)
fn cs_main(@builtin(global_invocation_id) id: vec3<u32>) {
    let i = id.x;
    
    // Захист від виходу за межі масиву
    if (i >= arrayLength(&objects)) { 
        return; 
    }

    // 1. Читаємо поточні дані об'єкта
    var sim = simData[i];

    // 2. Оновлюємо стан (час та кут повороту)
    sim.time += deltaTime;
    // Кут змінюється плавно залежно від часу (наприклад, 60 градусів на секунду)
    sim.angle = (sim.angle + (60.0 * deltaTime)) % 360.0;

    // 3. ЗБЕРІГАЄМО оновлені дані назад у буфер для наступного кадру
    simData[i] = sim;

    // 4. Обчислюємо вертикальне зміщення (синусоїда)
    let offsetZ = sin(sim.time * sim.frequency * PI * 2.0) * sim.amplitude;
    let pos = vec3<f32>(sim.position.x, sim.position.y, sim.position.z + offsetZ);

    // 5. Розрахунок матриці повороту навколо осі Z та позиції
    let rad = Deg2Rad(sim.angle);
    let c = cos(rad);
    let s = sin(rad);

    // Матриця mat4x4 (column-major за замовчуванням у WGSL)
    objects[i].model = mat4x4<f32>(
        vec4<f32>(c,   s,   0.0, 0.0),  // Стовпець 1 (X-axis)
        vec4<f32>(-s,  c,   0.0, 0.0),  // Стовпець 2 (Y-axis)
        vec4<f32>(0.0, 0.0, 1.0, 0.0),  // Стовпець 3 (Z-axis)
        vec4<f32>(pos.x, pos.y, pos.z, 1.0) // Стовпець 4 (Translation)
    );
}