# aqslim-website
Weight Loss Center Website - AQSlim

# AQSLIM — Clinical Weight Loss Management Platform
                                                                                                                                                                   
[Live Demo](aqslim.com) | [Architecture Doc](./docs/architecture.md)                                                                                               
                                                                                                                                                                   
> Full-stack web app for a real weight loss clinic in El Cajon, CA.                                                                                                
> Replaces a legacy system for 100+ patients with a role-based portal
> built on Next.js, Clerk Auth, Airtable, and AWS.                                                                                                                 
                                                          
## Stack                                                                                                                                                           
Next.js 15 (App Router) · Clerk · Airtable REST API · AWS S3 · Vercel
                                                                                                                                                                   
## Architecture
[Mermaid diagram or image here]                                                                                                                                    
                                                          
## Key Technical Decisions
- Why Vercel over AWS for the app layer (and what the AWS migration looks like)
- How Clerk user roles map to Airtable patient records                                                                                                             
- Why Airtable as the data layer (and when we'd migrate to RDS)
                                                                                                                                                                   
## Features                                                                                                                                                        
- Role-based auth: admin vs. patient portal                                                                                                               
- Bilingual UI (EN/ES)                                                                                                                                             
- Airtable integration: read/write from the app                                                                                                                    
- AWS S3 for protocol image storage
                                                                                                                       
## Revised Plan                                              
                                                                                                                                                                   
### MVP (Now) — Next.js on Vercel
- Admin login for Romulo (Clerk)
- Read from Airtable: patient list, consultation history
- AWS S3 for protocol images
- README with architecture diagram + migration plan documented
                                                                                                                                                                   
### v2 (Later) — Kotlin/Spring Boot on AWS
- Swap Next.js API routes → Spring Boot REST API on ECS Fargate
- Keep Next.js as the frontend (or migrate to standalone React)
- Patient login goes live here 
- Airtable write-back
