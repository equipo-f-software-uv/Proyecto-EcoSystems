El diagrama muestra la arquitectura de EcoSystems dividida en 4 capas:
1. Hardware: Es la base del sistema. Tres sensores Arduino capturan datos del campo en tiempo real (humedad del suelo, temperatura ambiente y flujo de agua), mientras que un actuador ejecuta físicamente la apertura o cierre de la válvula de riego.
2. Backend: Es el cerebro de datos. Una API REST recibe todas las lecturas de los sensores, las almacena en una base de datos histórica, y cuenta con dos módulos adicionales: uno que automatiza las decisiones de riego y otro que calcula proyecciones de costo hídrico y financiero.
3. IA y analítica: Agrega inteligencia al sistema. Los modelos predictivos procesan los datos para anticipar cuándo y cuánto regar según el clima y el estado del suelo. El análisis histórico permite comparar la eficiencia del riego entre distintas temporadas de siembra.
4. Frontend: Es la interfaz que ve el agricultor. Incluye un dashboard con monitoreo en tiempo real, un panel de alertas con control manual del riego, y una sección de reportes con las proyecciones financieras e historial de consumo.
El flujo general es simple: los sensores capturan → el backend procesa y almacena → la IA analiza y predice → el frontend muestra y permite controlar.
<img width="766" height="786" alt="diagrama" src="https://github.com/user-attachments/assets/00510aba-4734-4779-b793-796052826673" />

