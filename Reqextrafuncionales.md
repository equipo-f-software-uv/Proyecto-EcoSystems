# Requisitos Extrafuncionales

## Resumen de Atributos Seleccionados

### Prioridad Alta

| ID | Atributo | Descripción |
|:---|:---|:---|
|RNF-01| Mantenibilidad | Dado que el sistema combina hardware (Arduino) y componentes de software (Backend/IA) que van a evolucionar, el código debe seguir una arquitectura limpia y modular. Los componentes de adquisición de datos, analítica predictiva y frontend deben estar completamente desacoplados para permitir actualizaciones frecuentes o rotación en el equipo de desarrollo sin romper el sistema base. |
|RNF-02| Portabilidad | El sistema debe ser capaz de operar de manera óptima en múltiples entornos: la interfaz de usuario y analítica (Frontend) debe ser accesible vía Web y adaptable a dispositivos móviles para los agricultores en terreno, mientras que los módulos de procesamiento de datos e IA deben ejecutarse de manera eficiente en servidores o entornos en la nube. |
|RNF-03| Testabilidad | Para garantizar la precisión y seguridad de la automatización del riego, debe ser altamente factible verificar y validar el correcto funcionamiento de los sensores, las reglas de negocio y los modelos de IA. Se debe estructurar el proyecto para facilitar la integración de pruebas automatizadas y un flujo continuo de CI/CD que valide cada cambio en el software. |

### Prioridad Media

| ID | Atributo | Descripción |
|:---|:---|:---|
|RNF-04| Rendimiento / Eficiencia | El sistema debe procesar las lecturas de humedad, temperatura y flujo de agua en tiempo real. Los modelos predictivos de IA y el dashboard del frontend deben cargar las métricas y proyecciones hídricas en un tiempo de respuesta óptimo (menor a 3 segundos) para evitar retrasos críticos en la toma de decisiones agrícolas. |
|RNF-05| Seguridad | El sistema debe implementar mecanismos de autenticación y autorización seguros para asegurar que solo los agricultores o administradores autorizados puedan modificar los parámetros de riego automatizado y acceder a los datos históricos y proyecciones financieras del campo. |
|RNF-06| Usabilidad | La interfaz de gestión y control (Frontend) debe ser altamente intuitiva y adaptada al contexto de los productores agrícolas de la Región de Valparaíso, reduciendo al mínimo la necesidad de entrenamientos complejos o un alto nivel de expertise técnico previo para operar el dashboard. |
|RNF-07| Escalabilidad | La arquitectura de la base de datos y del backend debe estar preparada para soportar un incremento lineal en el volumen de datos recopilados (historiales de siembra prolongados) y permitir la incorporación futura de nuevos sensores o terrenos agrícolas sin degradar el rendimiento general. |

### Prioridad Baja

| ID | Atributo | Descripción |
|:---|:---|:---|
|RNF-08| Disponibilidad (Fiabilidad) | Aunque el sistema debe ser robusto, breves caídas temporales en la conectividad de la red de sensores o del servidor no deben comprometer la salud del cultivo. El hardware local basado en Arduino debe estar programado para manejar estados de contingencia autónomos si se pierde el enlace. |
|RNF-09| Interoperabilidad | El sistema debe contar con la capacidad de comunicarse limpiamente con APIs de servicios meteorológicos externos para nutrir con datos climáticos predictivos a los modelos de inteligencia artificial de forma estructurada. |
|RNF-10| Recuperabilidad | En caso de fallas imprevistas de energía o de conectividad en el campo, el sistema debe ser capaz de restablecerse automáticamente al último estado válido de configuración de riego para prevenir tanto el sobre-riego como la falta de agua, resguardando la integridad de los registros históricos. |
