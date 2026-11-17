# Project
Intelligent Bus Mobility & Crowdedness-Aware Journey Planner

A transit journey-planning system intended to combine:
- GPS-derived bus travel-time / traffic intelligence.
- Ticketing/passenger-derived demand and occupancy estimates.
- Journey optimization across travel time, crowding, walking, and transfers.

Important data caveats:
- Ticket records are not automatically a complete count of onboard passengers.
- Segment occupancy requires boarding and alighting information or another defensible load-estimation source.
- Without boarding/alighting stop data, label results as demand/crowding proxies, not measured segment occupancy.
- GPS observations only support road/time estimates for the roads and periods actually observed.
- A journey planner also needs route/stop topology, schedules, transfer rules, and walking links.

The actual city, data rights/provenance, data schemas, stack, and deployment target must be decided before implementation.
