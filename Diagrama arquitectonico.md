El diagrama muestra la arquitectura de EcoSystems dividida en 5 capas:
1. Hardware: Igual que antes — tres sensores Arduino (humedad del suelo, temperatura ambiente y flujo de agua) y un actuador para la válvula de riego.
2. Gateway multiprotocolo (nuevo — US-09): Actúa como capa de entrada desacoplada. Tres adaptadores independientes (MQTT, HTTP, LoRaWAN) reciben datos según el protocolo de cada sensor y los exponen a través de un puerto estándar único. El fallo de un adaptador no afecta a los demás.
3. Backend: Ahora tiene dos flujos explícitamente separados: una cola de ingesta asíncrona capaz de procesar 10.000 lecturas por segundo con alerta de capacidad (US-10), y un módulo de control de válvulas aislado con latencia garantizada menor a 100 ms y registro de auditoría (US-11, US-12). Las bases de datos también están separadas: una BD principal para el estado actual y una BD histórica de solo lectura (US-13), más el módulo de proyección financiera.
4. IA y analítica: Sin cambios estructurales — modelos predictivos para anticipar necesidades de riego y análisis histórico para comparativas por temporada. Ahora consume desde la BD histórica independiente, sin impactar el flujo de sensores.
5. Frontend: Mantiene los tres módulos (dashboard, alertas y control, reportes), pero ahora el dashboard incluye alertas de capacidad de ingesta, el panel de control incorpora auditoría de latencia, y los reportes hacen referencia explícita a los gráficos históricos con renderizado en menos de 2 segundos.

<img width="651" height="881" alt="Captura de pantalla 2026-04-21 130926" src="https://github.com/user-attachments/assets/55ee4dab-702d-4c13-93bd-0206e3887d62" />


