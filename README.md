# Proyecto-EcoSystems: Optimización de Riego mediante IoT e IA

## Descripción del sistema 

Proyecto-EcoSystems nació de una necesidad bastante concreta: enfrentar la crisis hídrica en la Región de Valparaíso. En un escenario de escasez severa, los métodos de riego tradicionales resultan ineficientes, provocando un desperdicio crítico de recursos que pone en riesgo la sostenibilidad del agro regional.

Se propone el desarrollo de un sistema integral de Internet de las Cosas (IoT) y Análisis de Datos diseñado para optimizar el consumo hídrico en tiempo real. El sistema genera una automatización del riego, transformando la gestión del campo en una operación basada en datos recogidos en tiempo real.

Para materializar esta solución, el proyecto se divide en tres pilares esenciales:
1. **Hardware y Obtención de datos:** Implementación de una red de sensores basados en Arduino para la medición de humedad en el suelo, temperatura y flujo de agua en tiempo real.
2. **Gestión de Datos:** Centralización de la información en una base de datos, permitiendo el almacenamiento histórico para realizar comparativas de eficiencia entre distintos periodos de siembra.
3. **Inteligencia y Analítica:** Uso de IA para modelos predictivos del clima/suelo y un módulo de proyecciones financieras para la planificación presupuestaria eficiente del gasto hídrico.

## Historias de Usuario 

| ID   | Nombre                                         | Issue  | 
|------|------------------------------------------------|--------| 
| US-01 | [Ej: Visualización de humedad en tiempo real]  | #1     | 
| US-02 | [Ej: Configuración de alertas de riego]        | #2     | 
| US-03 | [Ej: Consulta de proyecciones financieras]     | #3     | 
| US-04 | [Ej: Reporte histórico de consumo hídrico]     | #4     | 
| US-05 | [Ej: Modificación manual de parámetros de riego]| #5     | 
*(Nota: Añade o modifica las filas según las historias de usuario que tengan definidas en sus Issues de GitHub)*

## Requisitos Extrafuncionales 

Ver: [ReqExtrafuncionales.md](./ReqExtrafuncionales.md) *(Asegúrate de crear este archivo en tu repositorio)*

## Entidades del Dominio 

Ver: [modelo-dominio.md](./modelo-dominio.md) *(Asegúrate de crear este archivo en tu repositorio)*

## Mockups 
Enlace de figma: https://dig-cotton-96586616.figma.site/

| Mockup | Historia de usuario relacionada                                   |
|--------|-------------------------------------------------------------------|
|[Vista US-01](https://github.com/equipo-f-software-uv/Proyecto-EcoSystems/blob/main/US-01.png)|[#Issue 1](https://github.com/equipo-f-software-uv/Proyecto-EcoSystems/issues/1)|
|[Vista US-02](https://github.com/equipo-f-software-uv/Proyecto-EcoSystems/blob/main/US-02.png)|[#Issue 2](https://github.com/equipo-f-software-uv/Proyecto-EcoSystems/issues/2)|
|[Vista US-03](https://github.com/equipo-f-software-uv/Proyecto-EcoSystems/blob/main/US-03.png)|[#Issue 3](https://github.com/equipo-f-software-uv/Proyecto-EcoSystems/issues/3)| 
*(Nota: Recuerda subir las capturas de pantalla de tus mockups a la raíz de tu repositorio con nombres como US-01.png, o cambiar los enlaces a las imágenes correspondientes)*

## Diseño Arquitectónico 

Ver: [Arquitectura.md](./Arquitectura.md) *(Asegúrate de crear este archivo en tu repositorio)*
 
## Responsabilidades del Equipo 

| Integrante      | Rol         | Ítems de la rúbrica a cargo| 
|----------------|-------------|----------------------------|
| Joaquin Molina | Backend Developer | Gestión de Datos, Base de Datos, API |
| Bruno Diaz | Hardware Developer | Obtención de Datos, Conectividad IoT, Sensores Arduino |
| Jorge Bahamondes | Frontend Developer | Interfaz de Gestión y Control, UI/UX Mockups |
