-- Seed Data for Police MDT Web System
USE police_mdt;

-- Seed Users
INSERT INTO users (discord_id, fullname, rank, start_date, avatar, active) VALUES
('100000000000000001', 'Chief John Miller', 'Chief of Police', '2023-01-15', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', 1),
('100000000000000002', 'Assistant Chief Sarah Connor', 'Assistant Chief', '2023-03-10', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 1),
('100000000000000003', 'Captain Marcus Vance', 'Captain', '2023-06-01', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', 1),
('100000000000000004', 'Officer James Miller', 'Patrol Officer', '2024-01-20', 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150', 1),
('100000000000000005', 'Officer David Wright', 'Cadet', '2024-05-12', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150', 1);

-- Seed Duty Logs
INSERT INTO duty_logs (user_id, date, start_time, end_time, hours) VALUES
(1, '2026-08-01', '08:00', '18:00', 10.00),
(1, '2026-08-02', '09:00', '17:00', 8.00),
(2, '2026-08-01', '10:00', '20:00', 10.00),
(3, '2026-08-03', '12:00', '22:00', 10.00),
(4, '2026-08-04', '08:00', '16:00', 8.00);

-- Seed Cases
INSERT INTO cases (case_number, title, description, suspect_name, officer_in_charge, status) VALUES
('CASE-2026-001', 'Pacific Standard Bank Heist', 'Armored robbery involving 4 masked suspects armed with heavy rifles.', 'Unknown Gang', 'Chief John Miller', 'open'),
('CASE-2026-002', 'Illegal Street Racing - Vinewood Hills', 'Multiple high-speed sports vehicles racing through residential streets.', 'Tommy Vercetti', 'Captain Marcus Vance', 'closed'),
('CASE-2026-003', 'Paleto Bay Narcotics Distribution', 'Large shipment of illicit substances intercepted near Paleto Bay Pier.', 'Trevor Philips', 'Assistant Chief Sarah Connor', 'pending');

-- Seed Activities
INSERT INTO activities (title, description, reward, image, start_date, end_date, status) VALUES
('Operation Clean Sweep', 'Joint task force sweep in South Los Santos to suppress gang violence.', '$15,000 + Commendation Medal', 'https://images.unsplash.com/photo-1508847154043-be5407fcaa5a?w=600', '2026-08-05', '2026-08-15', 'active'),
('High-Speed Pursuit Certification Training', 'Tactical EVOC driving course at Sandy Shores Airfield for patrol officers.', 'EVOC Pursuit Badge + $5,000 Bonus', 'https://images.unsplash.com/photo-1541348263662-e082662d82da?w=600', '2026-08-08', '2026-08-20', 'active'),
('Swat Sniper Range Drill', 'Precision marksman evaluation at NOOSE tactical firing range.', 'Swat Marksmanship Pin', 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=600', '2026-07-01', '2026-07-10', 'finished');

-- Seed Activity Join
INSERT INTO activity_join (activity_id, user_id) VALUES
(1, 1),
(1, 4);

-- Seed Activity History
INSERT INTO activity_history (activity_id, title, description, reward, image, start_date, end_date, status) VALUES
(3, 'Swat Sniper Range Drill', 'Precision marksman evaluation at NOOSE tactical firing range.', 'Swat Marksmanship Pin', 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=600', '2026-07-01', '2026-07-10', 'finished');

-- Seed Shop Items
INSERT INTO shop_items (name, description, price, image, status) VALUES
('Tactical Heavy Body Armor', 'Class IV kevlar plate armor providing enhanced ballistic protection during high-risk calls.', 2500.00, 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=600', 'available'),
('Heavy Stun Taser X26', 'Non-lethal electroshock weapon equipped with dual laser targeting.', 800.00, 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=600', 'available'),
('High-Speed Spike Strip Package', 'Deployable tire deflation device for pursuit termination.', 450.00, 'https://images.unsplash.com/photo-1508847154043-be5407fcaa5a?w=600', 'available'),
('Tactical Night Vision Goggles', 'Gen-3 military grade night vision monocular for nocturnal tactical operations.', 5000.00, 'https://images.unsplash.com/photo-1508847154043-be5407fcaa5a?w=600', 'out_of_stock');

-- Seed System Announcements
INSERT INTO announcements (title, message, type) VALUES
('Welcome to LSPD Management Portal', 'All officers must log their duty hours accurately after every shift.', 'system'),
('New Operation Clean Sweep Active', 'Check the Activities tab to sign up for Operation Clean Sweep.', 'activity');

-- Seed Admin Logs
INSERT INTO logs (admin_discord_id, action, date, time, affected_user) VALUES
('100000000000000001', 'Created User Officer David Wright', '2026-08-05', '14:30:00', 'Officer David Wright'),
('100000000000000001', 'Added Duty Log for Chief John Miller', '2026-08-05', '18:05:00', 'Chief John Miller');
